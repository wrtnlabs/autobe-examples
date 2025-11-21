import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product exists and is draft (only draft products can be deleted)
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      deleted_at: null,
      status: "draft",
    },
  });

  if (!product) {
    throw new HttpException(
      "Product not found or not eligible for deletion",
      404,
    );
  }

  // Extract all variant IDs in one query before transaction (ensures atomicity)
  const variantIds = await MyGlobal.prisma.shopping_mall_product_variants
    .findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    })
    .then((variants) => variants.map((v) => v.id));

  // Use transaction to ensure atomic deletion of all related entities
  await MyGlobal.prisma.$transaction([
    // Soft-delete associated variants (update deleted_at)
    MyGlobal.prisma.shopping_mall_product_variants.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      data: { deleted_at: toISOStringSafe(new Date()) },
    }),

    // Soft-delete associated images directly linked to product
    MyGlobal.prisma.shopping_mall_product_images.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      data: { deleted_at: toISOStringSafe(new Date()) },
    }),

    // Delete category associations
    MyGlobal.prisma.shopping_mall_product_categories.deleteMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
    }),

    // Delete tag associations
    MyGlobal.prisma.shopping_mall_product_tags_products.deleteMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
    }),

    // Delete cart items referencing these variants
    MyGlobal.prisma.shopping_mall_cart_items.deleteMany({
      where: {
        shopping_mall_product_variant_id: {
          in: variantIds,
        },
      },
    }),

    // Delete wishlist items referencing these variants
    MyGlobal.prisma.shopping_mall_wishlist_items.deleteMany({
      where: {
        shopping_mall_product_variant_id: {
          in: variantIds,
        },
      },
    }),

    // Hard-delete product (per specification: permanent deletion)
    MyGlobal.prisma.shopping_mall_products.delete({
      where: {
        id: props.productId,
      },
    }),
  ]);
}
