'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from "next-auth/react"
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const medicalConditionsList = [
  'Diabetes',
  'Hypertension',
  'PCOD',
  'Thyroid',
  'Asthma',
  'Heart Disease',
];

const dietaryPreferences = ['Veg', 'Non Veg', 'Vegan'];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    age: '',
    height: '',
    weight: '',
    dietaryPreference: '',
    medicalConditions: [] as string[],
    customCondition: '',
  });
  const [loading, setLoading] = useState(false); // <-- Add this line


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setForm((prev) => ({ ...prev, dietaryPreference: value }));
  };

  const handleConditionChange = (condition: string) => {
    setForm((prev) => {
      const exists = prev.medicalConditions.includes(condition);
      return {
        ...prev,
        medicalConditions: exists
          ? prev.medicalConditions.filter((c) => c !== condition)
          : [...prev.medicalConditions, condition],
      };
    });
  };

  const handleAddCustomCondition = () => {
    if (
      form.customCondition.trim() &&
      !form.medicalConditions.includes(form.customCondition.trim())
    ) {
      setForm((prev) => ({
        ...prev,
        medicalConditions: [...prev.medicalConditions, prev.customCondition.trim()],
        customCondition: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     setLoading(true);
    try {
      const email = session?.user?.email || '';
      const res = await fetch('/api/user/update-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName: form.firstName,
          lastName: form.lastName,
          age: form.age,
          weight: form.weight,
          height: form.height,
          mobileNumber: form.mobile,
          dietaryPreference: form.dietaryPreference,
          medicalConditions: form.medicalConditions,
        }),
      });
      if (res.ok) {
        toast.success('Onboarding details submitted successfully! Redirecting you to main page...');
        router.push('/'); // Redirect to home
      } else {
        const errorData = await res.json();
        toast.error(`Error: ${errorData.message || 'Failed to submit onboarding.'}`);
      }
    } catch (err) {
      console.error('Error submitting onboarding:', err);
      toast.error('An error occurred while submitting your details.');
    } finally {
      setLoading(false); // <-- Reset loading state
    }
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-muted/60 to-background">
      <Card className="w-full max-w-lg shadow-xl rounded-2xl border border-muted-foreground/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-center tracking-tight">Welcome! 👋</CardTitle>
          <p className="text-muted-foreground text-center text-sm mt-2">
            Let’s get to know you better. Fill in your details below.
          </p>
        </CardHeader>
        <CardContent>
          {/* {JSON.stringify(session)} */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Info */}
            <div className="space-y-4 bg-muted/40 rounded-lg p-4">
              <h2 className="font-semibold text-lg mb-2 text-muted-foreground">Personal Information</h2>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="mobile">Mobile Number (e.g. 9999999999)</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  value={form.mobile}
                  onChange={handleChange}
                  required
                  pattern="[0-9]{10,15}"
                  placeholder="Enter your mobile number"
                  autoComplete="tel"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    value={form.age}
                    onChange={handleChange}
                    required
                    min={1}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    name="height"
                    type="number"
                    value={form.height}
                    onChange={handleChange}
                    required
                    min={30}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    value={form.weight}
                    onChange={handleChange}
                    required
                    min={2}
                  />
                </div>
              </div>
            </div>
            {/* Preferences */}
            <div className="space-y-4 bg-muted/40 rounded-lg p-4">
              <h2 className="font-semibold text-lg mb-2 text-muted-foreground">Preferences</h2>
              <div>
                <Label>Dietary Preference</Label>
                <Select value={form.dietaryPreference} onValueChange={handleSelectChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {dietaryPreferences.map((pref) => (
                      <SelectItem key={pref} value={pref}>
                        {pref}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2">Medical Conditions</Label>
                <div className="flex flex-wrap gap-3 mb-2">
                  {medicalConditionsList.map((condition) => (
                    <div key={condition} className="flex items-center gap-2 bg-background px-2 py-1 rounded-md shadow-sm">
                      <Checkbox
                        id={condition}
                        checked={form.medicalConditions.includes(condition)}
                        onCheckedChange={() => handleConditionChange(condition)}
                        className="accent-primary"
                      />
                      <Label htmlFor={condition} className="cursor-pointer">{condition}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    name="customCondition"
                    value={form.customCondition}
                    onChange={handleChange}
                    placeholder="Add custom condition"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomCondition}
                    size="sm"
                    variant="secondary"
                    className="rounded-lg"
                  >
                    Add
                  </Button>
                </div>
                {form.medicalConditions.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Selected:</span> {form.medicalConditions.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <Button
              type="submit"
              className="w-full py-3 text-base font-semibold rounded-xl shadow-md transition-all hover:scale-[1.02] hover:bg-primary/90"
              disabled={loading} // <-- Disable button when loading
            >
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}