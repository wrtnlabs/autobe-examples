import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallSellerAccount(props: {
  seller: SellerPayload;
}): Promise<void> {
  const sellerId = props.seller.id;
  // Check for pending order items with 'paid' or 'shipped' status
  const pendingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        seller_id: sellerId,
        status: { in: ["paid", "shipped"] },
        deleted_at: null,
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot delete account: you have pending orders that must be completed first",
      403,
    );
  }
  // Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        seller_id: sellerId,
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot delete account: you have pending cancellation requests that must be resolved first",
      403,
    );
  }
  // Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        seller_id: sellerId,
        status: "pending",
        deleted_at: null,
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot delete account: you have pending refund requests that must be resolved first",
      403,
    );
  }
  // All validations passed - soft delete the seller account
  // Products and variants will be cascade deleted via foreign key constraints
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: sellerId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
