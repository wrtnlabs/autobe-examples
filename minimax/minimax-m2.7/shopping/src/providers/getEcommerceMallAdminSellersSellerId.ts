import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerAtInvertTransformer } from "../transformers/EcommerceMallSellerAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminSellersSellerId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller.IInvert> {
  // Query seller with profile using transformer select
  const record = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
    ...EcommerceMallSellerAtInvertTransformer.select(),
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  // If seller is not approved, return basic info with null profile
  if (record.approval_status !== "approved") {
    return {
      id: record.id,
      approvalStatus: record.approval_status,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      profile: typia.assert<IEcommerceMallSeller.IInvert["profile"]>(null),
    } satisfies IEcommerceMallSeller.IInvert;
  }
  // For approved sellers, validate profile exists and is not deleted
  if (record.profile === null || record.profile.deleted_at !== null) {
    throw new HttpException("Seller profile not found", 404);
  }
  // Return full data with profile for approved sellers
  return await EcommerceMallSellerAtInvertTransformer.transform(record);
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminSellersSellerId(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSeller.IInvert> {
//   const record = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
//     ...EcommerceMallSellerAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------