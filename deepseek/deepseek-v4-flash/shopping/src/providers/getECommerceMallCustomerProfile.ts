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

export async function getECommerceMallCustomerProfile(props: {
  customer: CustomerPayload;
}): Promise<IECommerceMallCustomerProfile> {
  const record =
    await MyGlobal.prisma.e_commerce_mall_customer_profiles.findFirstOrThrow({
      where: {
        e_commerce_mall_customer_id: props.customer.id,
        deleted_at: null,
      },
      ...ECommerceMallCustomerProfileTransformer.select(),
    });
  return await ECommerceMallCustomerProfileTransformer.transform(record);
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
// export async function getECommerceMallCustomerProfile(props: {
//   customer: CustomerPayload;
// }): Promise<IECommerceMallCustomerProfile> {
//   const record = await MyGlobal.prisma.e_commerce_mall_customer_profiles.findFirstOrThrow({
//     ...ECommerceMallCustomerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallCustomerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------