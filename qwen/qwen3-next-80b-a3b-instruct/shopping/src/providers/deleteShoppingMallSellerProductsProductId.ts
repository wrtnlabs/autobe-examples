import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });

  if (!product) {
    throw new HttpException("Product not found or access denied", 404);
  }

  if (product.status !== "draft") {
    throw new HttpException(
      "Only draft products can be permanently deleted",
      400,
    );
  }

  // Ensure no active orders reference this product
  const hasOrderItems = await MyGlobal.prisma.shopping_mall_order_items.count({
    where: {
      shopping_mall_product_variant_id: {
        in: (
          await MyGlobal.prisma.shopping_mall_product_variants.findMany({
            where: {
              shopping_mall_product_id: props.productId,
              deleted_at: null,
            },
            select: { id: true },
          })
        ).map((v) => v.id),
      },
    },
  });

  if (hasOrderItems > 0) {
    throw new HttpException(
      "Product cannot be deleted as it is referenced in active orders",
      400,
    );
  }

  // Ensure no active cart items reference this product
  const hasCartItems = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where: {
      shopping_mall_product_variant_id: {
        in: (
          await MyGlobal.prisma.shopping_mall_product_variants.findMany({
            where: {
              shopping_mall_product_id: props.productId,
              deleted_at: null,
            },
            select: { id: true },
          })
        ).map((v) => v.id),
      },
    },
  });

  if (hasCartItems > 0) {
    throw new HttpException(
      "Product cannot be deleted as it is referenced in active carts",
      400,
    );
  }

  // Ensure no active wishlists reference this product
  const hasWishlistItems =
    await MyGlobal.prisma.shopping_mall_wishlist_items.count({
      where: {
        shopping_mall_product_variant_id: {
          in: (
            await MyGlobal.prisma.shopping_mall_product_variants.findMany({
              where: {
                shopping_mall_product_id: props.productId,
                deleted_at: null,
              },
              select: { id: true },
            })
          ).map((v) => v.id),
        },
      },
    });

  if (hasWishlistItems > 0) {
    throw new HttpException(
      "Product cannot be deleted as it is referenced in wishlists",
      400,
    );
  }

  // Get all variant IDs for deletion
  const variantIds = (
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId, deleted_at: null },
      select: { id: true },
    })
  ).map((v) => v.id);

  // Delete in transaction ensuring atomicity
  await MyGlobal.prisma.$transaction([
    // Delete product images
    MyGlobal.prisma.shopping_mall_product_images.deleteMany({
      where: {
        OR: [
          { shopping_mall_product_id: props.productId },
          { shopping_mall_product_variant_id: { in: variantIds } },
        ],
        deleted_at: null,
      },
    }),

    // Delete product tags
    MyGlobal.prisma.shopping_mall_product_tags_products.deleteMany({
      where: { shopping_mall_product_id: props.productId },
    }),

    // Delete product categories
    MyGlobal.prisma.shopping_mall_product_categories.deleteMany({
      where: { shopping_mall_product_id: props.productId },
    }),

    // Delete product variants
    MyGlobal.prisma.shopping_mall_product_variants.deleteMany({
      where: { shopping_mall_product_id: props.productId },
    }),

    // Delete the product itself
    MyGlobal.prisma.shopping_mall_products.delete({
      where: { id: props.productId },
    }),
  ]);

  // Log audit event
  await MyGlobal.prisma.shopping_mall_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.seller.id,
      actor_type: "seller",
      event_type: "product_deleted",
      event_details: JSON.stringify({
        product_id: props.productId,
        product_title: product.title,
      }),
      status: "success",
      source: "api",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
