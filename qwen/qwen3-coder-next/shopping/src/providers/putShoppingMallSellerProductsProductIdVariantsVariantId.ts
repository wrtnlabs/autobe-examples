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

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // 1. Retrieve target variant with parent product and seller ownership
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        product: {
          id: props.productId,
          shopping_mall_seller_id: props.seller.id,
        },
      },
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
            shopping_mall_seller_id: true,
            shopping_mall_category_id: true,
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
                created_at: true,
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
            variants: {
              select: {
                id: true,
                sku_code: true,
                price_override: true,
                stock_quantity: true,
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
  if (variant === null) {
    throw new HttpException("Variant not found or unauthorized", 404);
  }
  // 2. Validate SKU code uniqueness within same product (excluding current variant)
  if (variant.sku_code !== props.body.sku_code) {
    const existing =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          sku_code: props.body.sku_code,
          id: { not: props.variantId },
        },
      });
    if (existing !== null) {
      throw new HttpException("SKU code already exists in this product", 400);
    }
  }
  // 3. Update variant fields
  const updatedVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        sku_code: props.body.sku_code,
        price_override: props.body.price_override,
      },
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
            shopping_mall_seller_id: true,
            shopping_mall_category_id: true,
            seller: {
              select: {
                id: true,
                shop_name: true,
                approval_status: true,
                created_at: true,
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
            variants: {
              select: {
                id: true,
                sku_code: true,
                price_override: true,
                stock_quantity: true,
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
  // 4. Transform to response DTO
  const product = updatedVariant.product;
  const nonDeletedReviews = product.reviews.filter(
    (review: { deleted_at: Date | null }) => review.deleted_at === null,
  );
  const avgRating =
    nonDeletedReviews.length > 0
      ? Math.round(
          nonDeletedReviews.reduce(
            (
              sum: number,
              r: {
                rating: number;
              },
            ) => sum + r.rating,
            0,
          ) / nonDeletedReviews.length,
        )
      : 0;
  return {
    id: updatedVariant.id,
    shoppingMallProductId: updatedVariant.shopping_mall_product_id,
    skuCode: updatedVariant.sku_code,
    priceOverride: updatedVariant.price_override ?? undefined,
    stockQuantity: updatedVariant.stock_quantity,
    optionValues: updatedVariant.optionValues.map(
      (item: { option_value: string }) => item.option_value,
    ),
    product: {
      id: product.id,
      name: product.name,
      base_price: product.base_price,
      is_deleted: product.is_deleted,
      seller: {
        id: product.seller.id,
        shop_name: product.seller.shop_name,
        approval_status: product.seller.approval_status,
        created_at: toISOStringSafe(product.seller.created_at),
      } satisfies IShoppingMallSeller.ISummary,
      category: {
        id: product.category.id,
        name: product.category.name,
        description: product.category.description ?? null,
        parent: product.category.parent_category_id
          ? ({
              id: product.category.id,
              name: product.category.name,
              description: product.category.description ?? null,
              parent: null,
              subcategory_count: 0,
            } satisfies IShoppingMallCategory.ISummary)
          : null,
        subcategory_count: 0,
      } satisfies IShoppingMallCategory.ISummary,
      average_rating: avgRating,
    } satisfies IShoppingMallProduct.ISummary,
  };
}
