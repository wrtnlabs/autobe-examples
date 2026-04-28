import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformCustomerProfileTransformer } from "../transformers/EcommercePlatformCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformAdminCustomersCustomerIdProfiles(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IEcommercePlatformCustomerProfile.IUpdate;
}): Promise<IEcommercePlatformCustomerProfile> {
  // Validate customer exists and is not soft-deleted
  const customer =
    await MyGlobal.prisma.ecommerce_platform_customers.findUniqueOrThrow({
      where: {
        id: props.customerId,
        deleted_at: null,
      },
    });
  // Validate customer is not banned
  if (customer.is_banned === true) {
    throw new HttpException("Customer account is banned", 403);
  }
  // Validate display_name is non-empty if provided
  if (
    props.body.display_name !== undefined &&
    props.body.display_name.trim().length === 0
  ) {
    throw new HttpException("Display name must be non-empty", 400);
  }
  // Update profile with conditional fields
  const updated =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.update({
      where: {
        ecommerce_platform_customer_id: props.customerId,
      },
      data: {
        ...(props.body.display_name !== undefined && {
          display_name: props.body.display_name,
        }),
        ...(props.body.phone_number !== undefined && {
          phone_number: props.body.phone_number,
        }),
        updated_at: new Date(),
      },
      ...EcommercePlatformCustomerProfileTransformer.select(),
    });
  return await EcommercePlatformCustomerProfileTransformer.transform(updated);
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
// import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommercePlatformAdminCustomersCustomerIdProfiles(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformCustomerProfile.IUpdate;
// }): Promise<IEcommercePlatformCustomerProfile> {
//   await MyGlobal.prisma.ecommerce_platform_customer_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_platform_customer_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...EcommercePlatformCustomerProfileTransformer.select(),
//   });
//   return await EcommercePlatformCustomerProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------