import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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

export async function getShoppingMallSellerVariantsVariantIdInventoryRecordId(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  recordId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryRecord> {
  // Query inventory record with full ownership chain (variant → product → seller)
  const record =
    await MyGlobal.prisma.shopping_mall_inventory_records.findUniqueOrThrow({
      where: { id: props.recordId },
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        variant: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                shopping_mall_seller_id: true,
              },
            },
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        order: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        cancellationRequest: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs,
        refundRequest: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs,
        seller: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
      },
    });
  // Verify record belongs to the specified variant
  if (record.variant.id !== props.variantId) {
    throw new HttpException("Inventory record not found for this variant", 404);
  }
  // Verify seller ownership
  if (record.variant.product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform to response DTO
  return {
    id: record.id,
    variant_id: record.variant.id,
    quantity_change: record.quantity_change,
    reason: record.reason,
    created_at: record.created_at.toISOString(),
    order_id: record.order?.id ?? null,
    cancellation_request_id: record.cancellationRequest?.id ?? null,
    refund_request_id: record.refundRequest?.id ?? null,
    seller_id: record.seller?.id ?? null,
  };
}
