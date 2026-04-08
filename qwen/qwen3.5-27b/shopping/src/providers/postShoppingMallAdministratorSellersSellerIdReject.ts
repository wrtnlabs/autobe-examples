import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellersSellerIdReject(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IReject;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
    select: {
      id: true,
      approval_status: true,
      banned: true,
      suspended: true,
    },
  });
  if (seller.approval_status !== "pending") {
    throw new HttpException("Seller is not in pending approval status", 400);
  }
  if (seller.banned) {
    throw new HttpException("Cannot reject a banned seller", 400);
  }
  if (seller.suspended) {
    throw new HttpException("Cannot reject a suspended seller", 400);
  }
  if (
    !props.body.rejectionReason ||
    props.body.rejectionReason.trim().length === 0
  ) {
    throw new HttpException("Rejection reason is required", 400);
  }
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: "rejected",
      rejection_reason: props.body.rejectionReason,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_seller_profiles.update({
    where: { shopping_mall_seller_id: props.sellerId },
    data: {
      rejection_reason: props.body.rejectionReason,
    },
  });
  await MyGlobal.prisma.shopping_mall_administrator_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_administrator_id: props.administrator.id,
      action_type: "reject_seller",
      target_type: "seller",
      target_id: props.sellerId,
      ip_address: "0.0.0.0",
      created_at: now,
    },
  });
  const updatedSeller =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...ShoppingMallSellerTransformer.select(),
    });
  return await ShoppingMallSellerTransformer.transform(updatedSeller);
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
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdministratorSellersSellerIdReject(props: {
//   administrator: AdministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IShoppingMallSeller.IReject;
// }): Promise<IShoppingMallSeller> {
//   const record = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
//     ...ShoppingMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------