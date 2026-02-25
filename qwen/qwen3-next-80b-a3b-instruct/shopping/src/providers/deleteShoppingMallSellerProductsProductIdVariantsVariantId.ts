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

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
}): Promise<void> {
  // 1. Validate variant belongs to product and seller owns product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true, product_id: true },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  // Validate seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }
  // 2. Check for paid or shipped order items
  const activeOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.findMany({
      where: {
        shopping_mall_product_variant_id: props.variantId,
        status: {
          in: ["paid", "shipped"],
        },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (activeOrderItems.length > 0) {
    throw new HttpException(
      "Cannot delete variant because it has paid or shipped order items",
      409,
    );
  }
  const activeOrderItemIds = activeOrderItems.map((item) => item.id);
  // 3. Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findMany({
      where: {
        order_item_id: {
          in: activeOrderItemIds,
        },
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (pendingCancellations.length > 0) {
    throw new HttpException(
      "Cannot delete variant because it has pending cancellation requests",
      409,
    );
  }
  // 4. Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.findMany({
      where: {
        order_item_id: {
          in: activeOrderItemIds,
        },
        status: "pending",
      },
      select: { id: true },
    });
  if (pendingRefunds.length > 0) {
    throw new HttpException(
      "Cannot delete variant because it has pending refund requests",
      409,
    );
  }
  // 5. Soft delete variant - set deleted_at to current time
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      deleted_at: now,
    },
  });
  // 6. Create snapshot
  const variantRecord =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        sku_code: true,
        price: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!variantRecord) {
    throw new HttpException("Variant data not found after update", 500);
  }
  const snapshotData = {
    id: v4() as string & tags.Format<"uuid">,
    variant: { connect: { id: props.variantId } },
    sku_code: variantRecord.sku_code,
    price: variantRecord.price,
    created_at: toISOStringSafe(variantRecord.created_at),
    updated_at: toISOStringSafe(variantRecord.updated_at),
    version: 1,
    changed_at: now,
    actor: { connect: { id: props.seller.id } },
    operation: "delete",
  };
  await MyGlobal.prisma.shopping_mall_product_variant_snapshots.create({
    data: snapshotData,
  });
  // 7. Delete inventory logs
  await MyGlobal.prisma.shopping_mall_inventory_logs.deleteMany({
    where: { variant_id: props.variantId },
  });
  return;
}
