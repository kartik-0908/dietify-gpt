ALTER TABLE "User" ADD COLUMN "firstName" varchar(32);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "lastName" varchar(32);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "age" varchar(3);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "weight" varchar(8);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "height" varchar(8);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "mobileNumber" varchar(16);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "dietaryPreference" varchar(64);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "medicalConditions" json;