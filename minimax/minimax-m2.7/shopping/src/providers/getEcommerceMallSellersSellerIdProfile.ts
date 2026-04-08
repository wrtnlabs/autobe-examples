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
import { EcommerceMallSellerProfileTransformer } from "../transformers/EcommerceMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellersSellerIdProfile(props: {
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerProfile> {
  // First verify the seller exists and is approved
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: { id: props.sellerId },
    select: { id: true, approval_status: true },
  });
  if (!seller) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller not found", 404);
  }
  // Query the seller profile with seller relation
  const record = await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirst(
    {
      ...EcommerceMallSellerProfileTransformer.select(),
      where: { seller_id: props.sellerId, deleted_at: null },
    },
  );
  if (!record) {
    throw new HttpException("Seller profile not found", 404);
  }
  return await EcommerceMallSellerProfileTransformer.transform(record);
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
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellersSellerIdProfile(props: {
//   sellerId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSellerProfile> {
//   const record = await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirstOrThrow({
//     ...EcommerceMallSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------