import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerAtSuspensionTransformer } from "../transformers/ShoppingMallSellerAtSuspensionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminSellersSellerIdSuspensions(props: {
  admin: AdminPayload;
  sellerId: string;
  body: IShoppingMallSeller.ISuspensionRequest;
}): Promise<IShoppingMallSeller.ISuspension> {
  // Validate seller exists
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
  });
  // Update seller approval status based on action
  const updatedSeller = await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: props.body.action === "suspend" ? "pending" : "approved",
      rejection_reason:
        props.body.action === "suspend" && props.body.reason
          ? props.body.reason
          : null,
      updated_at: new Date(),
    },
    select: {
      id: true,
      shop_name: true,
      approval_status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Return transformed suspension information
  return ShoppingMallSellerAtSuspensionTransformer.transform(updatedSeller);
}
