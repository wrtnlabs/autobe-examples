import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function putShoppingMallSellerSellersProductsVariantsVariantId(props: {
  seller: SellerPayload;
  variantId: string;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        shopping_mall_product_id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
      },
    });
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: variant.shopping_mall_product_id },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        is_deleted: true,
        name: true,
        base_price: true,
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            parent_category_id: true,
          },
        },
        seller: {
          select: {
            id: true,
            shop_name: true,
            approval_status: true,
          },
        },
        reviews: {
          select: {
            rating: true,
            deleted_at: true,
          },
        },
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_product_variants.update({
    where: { id: props.variantId },
    data: {
      sku_code: props.body.sku_code,
      price_override: props.body.price_override ?? null,
    },
  });
  const updatedVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        sku_code: true,
        price_override: true,
        stock_quantity: true,
        optionValues: {
          select: {
            option_value: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            is_deleted: true,
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                parent_category_id: true,
              },
            },
            reviews: {
              select: {
                rating: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  const nonDeletedReviews = updatedVariant.product.reviews.filter(
    (review) => review.deleted_at === null,
  );
  const avgRating =
    nonDeletedReviews.length > 0
      ? Math.round(
          nonDeletedReviews.reduce((sum, r) => sum + r.rating, 0) /
            nonDeletedReviews.length,
        )
      : 0;
  return {
    id: updatedVariant.id,
    shoppingMallProductId: updatedVariant.shopping_mall_product_id,
    skuCode: updatedVariant.sku_code,
    priceOverride: updatedVariant.price_override ?? undefined,
    stockQuantity: updatedVariant.stock_quantity,
    optionValues: updatedVariant.optionValues.map((item) => item.option_value),
    product: {
      id: updatedVariant.product.id,
      name: updatedVariant.product.name,
      base_price: updatedVariant.product.base_price,
      is_deleted: updatedVariant.product.is_deleted,
      seller: {
        id: updatedVariant.product.seller.id,
        shop_name: updatedVariant.product.seller.shop_name,
        approval_status: updatedVariant.product.seller.approval_status,
        created_at: toISOStringSafe(new Date()),
      },
      category: {
        id: updatedVariant.product.category.id,
        name: updatedVariant.product.category.name,
        description: updatedVariant.product.category.description ?? null,
        parent: updatedVariant.product.category.parent_category_id
          ? {
              id: updatedVariant.product.category.id,
              name: updatedVariant.product.category.name,
              description: updatedVariant.product.category.description ?? null,
              parent: null,
              subcategory_count: 0,
            }
          : null,
        subcategory_count: 0,
      },
      average_rating: avgRating,
    },
  };
}
