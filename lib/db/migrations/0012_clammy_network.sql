CREATE TABLE IF NOT EXISTS "CaloriesIntakeLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"calories" numeric(8, 2) NOT NULL,
	"foodItem" varchar(128) NOT NULL,
	"quantity" numeric(6, 2),
	"unit" varchar(32),
	"mealType" varchar(32) DEFAULT 'snack' NOT NULL,
	"consumedAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"source" varchar(32) DEFAULT 'manual'
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CaloriesIntakeLog" ADD CONSTRAINT "CaloriesIntakeLog_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
