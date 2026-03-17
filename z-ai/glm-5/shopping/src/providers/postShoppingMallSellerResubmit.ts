import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerResubmit(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.IResubmit;
}): Promise<IShoppingMallSeller> {
  // Get current seller
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
    select: {
      id: true,
      approval_status: true,
      banned: true,
      deleted_at: true,
    },
  });
  // Check if deleted
  if (seller.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 400);
  }
  // Check if banned
  if (seller.banned) {
    throw new HttpException("Account is banned", 403);
  }
  // Check if approval_status is 'rejected'
  if (seller.approval_status !== "rejected") {
    throw new HttpException("Only rejected sellers can resubmit", 400);
  }
  // Update seller with new shop info
  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.seller.id },
    data: {
      shop_name: props.body.shop_name,
      shop_description: props.body.shop_description ?? null,
      logo_image: props.body.logo_image ?? null,
      approval_status: "pending",
      rejection_reason: null,
      updated_at: new Date(),
    },
    ...ShoppingMallSellerTransformer.select(),
  });
  return await ShoppingMallSellerTransformer.transform(updated);
}
