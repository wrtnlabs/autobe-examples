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

export async function deleteEcommerceMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product ownership - use findUniqueOrThrow for automatic 404
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden - not product owner", 403);
  }
  // Verify variant exists and belongs to product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true, product_id: true },
    });
  // Check for blocking order items (paid or shipped status)
  const pendingOrderItems =
    await MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: {
        variant_id: props.variantId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot delete variant with pending order items",
      409,
    );
  }
  // Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: {
        orderItem: { variant_id: props.variantId },
        status: "pending",
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot delete variant with pending cancellation requests",
      409,
    );
  }
  // Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        orderItem: { variant_id: props.variantId },
        status: "pending",
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot delete variant with pending refund requests",
      409,
    );
  }
  // Delete the variant (inventory records cascade automatically)
  await MyGlobal.prisma.ecommerce_mall_product_variants.delete({
    where: { id: props.variantId },
  });
  // Check if this was the last variant
  const remainingVariants =
    await MyGlobal.prisma.ecommerce_mall_product_variants.count({
      where: { product_id: props.productId },
    });
  // Mark product as unavailable by soft-deleting it
  if (remainingVariants === 0) {
    await MyGlobal.prisma.ecommerce_mall_products.update({
      where: { id: props.productId },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}
