import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallCustomerProfileTransformer } from "../transformers/ECommerceMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IECommerceMallCustomerProfile.IUpdate;
}): Promise<IECommerceMallCustomerProfile> {
  // Verify profile exists (404 if not)
  await MyGlobal.prisma.e_commerce_mall_customer_profiles.findFirstOrThrow({
    where: {
      e_commerce_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Update only explicitly provided fields
  await MyGlobal.prisma.e_commerce_mall_customer_profiles.update({
    where: { e_commerce_mall_customer_id: props.customer.id },
    data: {
      ...(props.body.displayName !== undefined && {
        display_name: props.body.displayName,
      }),
      ...(props.body.phoneNumber !== undefined && {
        phone_number: props.body.phoneNumber,
      }),
      updated_at: new Date().toISOString(),
    },
  });
  // Fetch updated record with full transformer
  const updated =
    await MyGlobal.prisma.e_commerce_mall_customer_profiles.findUniqueOrThrow({
      where: { e_commerce_mall_customer_id: props.customer.id },
      ...ECommerceMallCustomerProfileTransformer.select(),
    });
  return await ECommerceMallCustomerProfileTransformer.transform(updated);
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
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putECommerceMallCustomerProfile(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallCustomerProfile.IUpdate;
// }): Promise<IECommerceMallCustomerProfile> {
//   await MyGlobal.prisma.e_commerce_mall_customer_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_customer_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallCustomerProfileTransformer.select(),
//   });
//   return await ECommerceMallCustomerProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------