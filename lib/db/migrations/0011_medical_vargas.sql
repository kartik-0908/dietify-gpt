CREATE TABLE IF NOT EXISTS "WaterIntakeLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"amount" numeric(6, 2) NOT NULL,
	"unit" varchar(8) DEFAULT 'ml' NOT NULL,
	"consumedAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"source" varchar(32) DEFAULT 'manual'
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "WaterIntakeLog" ADD CONSTRAINT "WaterIntakeLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
