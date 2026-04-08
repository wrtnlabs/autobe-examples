import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

type DateTimeString = string & tags.Format<"date-time">;
type UuidString = string & tags.Format<"uuid">;
function toDateTimeString(date: Date): DateTimeString {
  return date.toISOString() as DateTimeString;
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
export async function patchEcommerceMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerProfile.IUpdate;
}): Promise<IEcommerceMallCustomerProfile> {
  // Step 1: Verify customer account is active (section 403)
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: { deleted_at: true },
  });
  if (!customer) {
    throw new HttpException("Account does not exist", 404);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Account is pending deletion", 400);
  }
  // Step 2: Query existing profile
  const existingProfile =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.findUnique({
      where: { ecommerce_mall_customer_id: props.customer.id },
      select: {
        id: true,
        display_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!existingProfile) {
    throw new HttpException("Profile not found", 404);
  }
  // Step 3: Determine which fields to update
  const displayNameToUpdate = props.body.displayName;
  const phoneToUpdate = props.body.phone;
  const hasDisplayName = displayNameToUpdate !== undefined;
  const hasPhone = phoneToUpdate !== undefined;
  // Step 4: Validate empty/whitespace-only strings per section 400
  if (hasDisplayName && !isNonEmptyString(displayNameToUpdate)) {
    throw new HttpException("Display name cannot be empty", 400);
  }
  if (hasPhone && !isNonEmptyString(phoneToUpdate)) {
    throw new HttpException("Phone number cannot be empty", 400);
  }
  // Step 5: If no fields provided, return unchanged per section 401
  if (!hasDisplayName && !hasPhone) {
    return buildProfileResponse(existingProfile, props.customer.id);
  }
  // Step 6: Build update payload with only provided fields
  const updatePayload: {
    display_name?: string;
    phone?: string;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (hasDisplayName && isNonEmptyString(displayNameToUpdate)) {
    updatePayload.display_name = displayNameToUpdate;
  }
  if (hasPhone && isNonEmptyString(phoneToUpdate)) {
    updatePayload.phone = phoneToUpdate;
  }
  // Step 7: Execute partial update
  await MyGlobal.prisma.ecommerce_mall_customer_profiles.update({
    where: { id: existingProfile.id },
    data: updatePayload,
  });
  // Step 8: Fetch updated profile
  const updatedProfile =
    await MyGlobal.prisma.ecommerce_mall_customer_profiles.findUniqueOrThrow({
      where: { id: existingProfile.id },
      select: {
        id: true,
        display_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
      },
    });
  return buildProfileResponse(updatedProfile, props.customer.id);
}
function buildProfileResponse(
  profile: {
    id: string;
    display_name: string;
    phone: string;
    created_at: Date;
    updated_at: Date;
  },
  customerId: UuidString,
): IEcommerceMallCustomerProfile {
  return {
    id: profile.id as UuidString,
    profileType: "customer",
    customerId: customerId,
    displayName: profile.display_name,
    phone: profile.phone,
    createdAt: toDateTimeString(profile.created_at),
    updatedAt: toDateTimeString(profile.updated_at),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerProfile(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCustomerProfile.IUpdate;
// }): Promise<IEcommerceMallCustomerProfile> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------