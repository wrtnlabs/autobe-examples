import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify parent product ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  // Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });

  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }

  // Check for cart item dependencies using count for efficiency
  const cartItemCount = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where: {
      shopping_mall_product_variant_id: props.variantId,
    },
  });

  if (cartItemCount > 0) {
    throw new HttpException(
      "Cannot delete variant: it is currently in shopping carts",
      400,
    );
  }

  // Check for order item dependencies
  const orderItemCount = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      shopping_mall_product_variant_id: props.variantId,
    },
  });

  if (orderItemCount > 0) {
    throw new HttpException(
      "Cannot delete variant: it is referenced in existing orders",
      400,
    );
  }

  // Perform hard deletion
  await MyGlobal.prisma.shopping_mall_product_variants.delete({
    where: {
      id: props.variantId,
    },
  });
}
