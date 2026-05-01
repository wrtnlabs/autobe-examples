import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminSellersSellerIdApprove(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.approval_status === "approved") {
    throw new HttpException("Seller is already approved", 409);
  }
  if (seller.approval_status === "rejected") {
    throw new HttpException(
      "Seller registration was rejected. The seller must resubmit their registration before approval.",
      409,
    );
  }
  if (seller.id === props.admin.id) {
    throw new HttpException("Self-approval is not permitted", 403);
  }
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: "approved",
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    },
  });
  await MyGlobal.prisma.shopping_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      admin: { connect: { id: props.admin.id } },
      action_type: "approve_seller",
      target_entity_type: "seller",
      target_entity_id: props.sellerId,
      old_value: seller.approval_status,
      new_value: "approved",
      reason: null,
      created_at: new Date().toISOString(),
    },
  });
  const updated = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
    where: { id: props.sellerId },
    ...ShoppingMallSellerTransformer.select(),
  });
  return await ShoppingMallSellerTransformer.transform(updated);
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
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdminSellersSellerIdApprove(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallSeller> {
//   const record = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
//     ...ShoppingMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------