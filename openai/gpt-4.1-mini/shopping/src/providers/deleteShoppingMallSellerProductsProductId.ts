import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized operation", 403);
  }
  const productVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId, deleted_at: null },
      select: { id: true },
    });
  const variantIds = productVariants.map((v) => v.id);
  if (variantIds.length > 0) {
    const orderItems = await MyGlobal.prisma.shopping_mall_order_items.findMany(
      {
        where: {
          shopping_mall_product_variant_id: { in: variantIds },
          status: { notIn: ["cancelled", "refunded"] },
          deleted_at: null,
        },
        select: { id: true },
      },
    );
    const orderItemIds = orderItems.map((o) => o.id);
    if (orderItemIds.length > 0) {
      const pendingCancellationCount =
        await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
          where: {
            shopping_mall_order_item_id: { in: orderItemIds },
            seller_approval_status: "pending",
            deleted_at: null,
          },
        });
      if (pendingCancellationCount > 0) {
        throw new HttpException(
          "Cannot delete product with pending cancellation requests",
          400,
        );
      }
      const pendingRefundCount =
        await MyGlobal.prisma.shopping_mall_refund_requests.count({
          where: {
            shopping_mall_order_item_id: { in: orderItemIds },
            status: "pending",
            deleted_at: null,
          },
        });
      if (pendingRefundCount > 0) {
        throw new HttpException(
          "Cannot delete product with pending refund requests",
          400,
        );
      }
    }
    if (orderItemIds.length > 0) {
      throw new HttpException(
        "Cannot delete product with pending order items",
        400,
      );
    }
  }
  await MyGlobal.prisma.shopping_mall_inventory_histories.deleteMany({
    where: { shopping_mall_product_variant_id: { in: variantIds } },
  });
  await MyGlobal.prisma.shopping_mall_product_variants.deleteMany({
    where: { id: { in: variantIds } },
  });
  await MyGlobal.prisma.shopping_mall_products.delete({
    where: { id: props.productId },
  });
  return {
    id: product.id,
    seller_id: product.seller_id,
    product_subcategory_id: product.product_subcategory_id,
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    created_at: toISOStringSafe(product.created_at),
    updated_at: toISOStringSafe(product.updated_at),
    deleted_at: product.deleted_at ? toISOStringSafe(product.deleted_at) : null,
  };
}
