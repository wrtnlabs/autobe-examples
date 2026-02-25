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

export async function postShoppingMallSellerReapply(props: {
  seller: SellerPayload;
  body: IShoppingMallSeller.IReapply;
}): Promise<IShoppingMallSeller> {
  // Fetch current seller to verify state
  const currentSeller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: {
      id: true,
      deleted_at: true,
      approval_status: true,
    },
  });
  // Seller not found or deleted
  if (currentSeller === null || currentSeller.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }
  // Verify seller is rejected - only rejected sellers can reapply
  if (currentSeller.approval_status === "pending") {
    throw new HttpException("Already awaiting review", 400);
  }
  if (currentSeller.approval_status === "approved") {
    throw new HttpException("Use profile update endpoint instead", 400);
  }
  if (currentSeller.approval_status === "suspended") {
    throw new HttpException("Account suspended - contact administrator", 403);
  }
  if (currentSeller.approval_status !== "rejected") {
    throw new HttpException("Not eligible for reapplication", 400);
  }
  // Update seller record with optional profile changes and reset status
  const updated = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.seller.id },
    data: {
      ...(props.body.shopName !== undefined && {
        shop_name: props.body.shopName,
      }),
      ...(props.body.shopDescription !== undefined && {
        shop_description: props.body.shopDescription,
      }),
      ...(props.body.logoUrl !== undefined && { logo_url: props.body.logoUrl }),
      rejection_reason: null,
      approval_status: "pending",
      updated_at: new Date(),
    },
    ...ShoppingMallSellerTransformer.select(),
  });
  return await ShoppingMallSellerTransformer.transform(updated);
}
