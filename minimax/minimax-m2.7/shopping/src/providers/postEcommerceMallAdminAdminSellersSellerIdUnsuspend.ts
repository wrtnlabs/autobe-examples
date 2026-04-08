import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerTransformer } from "../transformers/EcommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminSellersSellerIdUnsuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSeller.IUnsuspend;
}): Promise<IEcommerceMallSeller> {
  // 1. Find the seller by ID (404 if not found)
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      ...EcommerceMallSellerTransformer.select(),
      where: { id: props.sellerId },
    },
  );
  // 2. Check for active suspension (restored_at IS NULL)
  const activeSuspension =
    await MyGlobal.prisma.ecommerce_mall_seller_suspensions.findFirst({
      where: {
        ecommerce_mall_seller_id: props.sellerId,
        restored_at: null,
      },
    });
  // 3. If no active suspension, return 400 error
  if (!activeSuspension) {
    throw new HttpException("Seller is not currently suspended", 400);
  }
  // 4. Update the suspension record with restoration details
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_seller_suspensions.update({
    where: { id: activeSuspension.id },
    data: {
      restored_by_id: props.admin.id,
      restored_reason: props.body.restoredReason ?? null,
      restored_at: now,
      updated_at: now,
    },
  });
  // 5. Return the updated seller
  const updatedSeller =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      ...EcommerceMallSellerTransformer.select(),
      where: { id: props.sellerId },
    });
  return await EcommerceMallSellerTransformer.transform(updatedSeller);
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
// import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAdminAdminSellersSellerIdUnsuspend(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSeller.IUnsuspend;
// }): Promise<IEcommerceMallSeller> {
//   const record = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
//     ...EcommerceMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------