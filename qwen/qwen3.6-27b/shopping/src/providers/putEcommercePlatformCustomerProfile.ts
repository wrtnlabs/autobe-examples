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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformCustomerProfileTransformer } from "../transformers/EcommercePlatformCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommercePlatformCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformCustomerProfile.IUpdate;
}): Promise<IEcommercePlatformCustomerProfile> {
  // Validate display_name is not empty when provided (section 419)
  if (
    props.body.display_name !== undefined &&
    props.body.display_name.trim() === ""
  ) {
    throw new HttpException("Display name cannot be empty", 400);
  }
  // Update profile with conditional fields from request body
  await MyGlobal.prisma.ecommerce_platform_customer_profiles.update({
    where: { ecommerce_platform_customer_id: props.customer.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.phone_number !== undefined && {
        phone_number: props.body.phone_number,
      }),
      updated_at: new Date(),
    },
  });
  // Re-fetch with transformer select and return transformed result
  const updated =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.findFirstOrThrow(
      {
        where: { ecommerce_platform_customer_id: props.customer.id },
        ...EcommercePlatformCustomerProfileTransformer.select(),
      },
    );
  return EcommercePlatformCustomerProfileTransformer.transform(updated);
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
// export async function putEcommercePlatformCustomerProfile(props: {
//   customer: CustomerPayload;
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