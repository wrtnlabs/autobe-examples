import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerRegistrationTransformer } from "../transformers/EcommerceMallSellerRegistrationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerRegistrationsRegistrationId(props: {
  seller: SellerPayload;
  registrationId: string;
}): Promise<IEcommerceMallSellerRegistration> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findFirstOrThrow({
      ...EcommerceMallSellerRegistrationTransformer.select(),
      where: {
        id: props.registrationId,
        seller_id: props.seller.id,
      },
    });
  return await EcommerceMallSellerRegistrationTransformer.transform(record);
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
// import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerRegistrationsRegistrationId(props: {
//   seller: SellerPayload;
//   registrationId: string;
// }): Promise<IEcommerceMallSellerRegistration> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_registrations.findFirstOrThrow({
//     ...EcommerceMallSellerRegistrationTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerRegistrationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------