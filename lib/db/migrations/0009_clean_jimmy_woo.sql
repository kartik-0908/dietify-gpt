ALTER TABLE "User" ADD COLUMN "dateOfBirth" varchar(16);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "fitnessGoal" varchar(32);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "activityLevel" varchar(32);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "gender" varchar(16);--> statement-breakpoint
ALTER TABLE "User" DROP COLUMN IF EXISTS "age";