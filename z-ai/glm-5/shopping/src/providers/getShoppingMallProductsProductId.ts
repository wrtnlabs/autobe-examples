import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallProductsProductId(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProduct> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: {
            id: true,
            shop_name: true,
            logo_image: true,
            approval_status: true,
            suspended: true,
            banned: true,
            created_at: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            parent: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
              },
            },
          },
        },
        images: {
          select: {
            id: true,
            image_url: true,
            display_order: true,
            created_at: true,
          },
          orderBy: { display_order: "asc" as const },
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
        variants: {
          select: {
            id: true,
            sku_code: true,
            option_values: true,
            price: true,
            created_at: true,
            deleted_at: true,
            inventoryRecords: {
              select: { quantity_change: true },
            },
          },
          where: { deleted_at: null },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        reviews: {
          select: {
            rating: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
      },
    });
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller.suspended || product.seller.banned) {
    throw new HttpException("Product not found", 404);
  }
  const activeReviews = product.reviews.filter((r) => r.deleted_at === null);
  const averageRating =
    activeReviews.length > 0
      ? activeReviews.reduce((sum, r) => sum + r.rating, 0) /
        activeReviews.length
      : null;
  const sellerApprovalStatus = typia.assert<
    "pending" | "approved" | "rejected"
  >(product.seller.approval_status);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    base_price: product.base_price,
    seller: {
      id: product.seller.id,
      shop_name: product.seller.shop_name,
      logo_image: product.seller.logo_image ?? null,
      approval_status: sellerApprovalStatus,
      suspended: product.seller.suspended,
      banned: product.seller.banned,
      created_at: product.seller.created_at.toISOString(),
    } satisfies IShoppingMallSeller.ISummary,
    category: {
      id: product.category.id,
      name: product.category.name,
      description: product.category.description,
      parent: product.category.parent
        ? ({
            id: product.category.parent.id,
            name: product.category.parent.name,
            description: product.category.parent.description,
            created_at: product.category.parent.created_at.toISOString(),
            parent: null,
          } satisfies IShoppingMallCategory.ISummary)
        : null,
      created_at: product.category.created_at.toISOString(),
    } satisfies IShoppingMallCategory.ISummary,
    images: product.images.map((image) => ({
      id: image.id,
      image_url: image.image_url,
      display_order: image.display_order,
      created_at: image.created_at.toISOString(),
    })) satisfies IShoppingMallProductImage.ISummary[],
    variants: product.variants.map((variant) => {
      const stockQuantity = variant.inventoryRecords.reduce(
        (sum, r) => sum + r.quantity_change,
        0,
      );
      const effectivePrice = variant.price ?? product.base_price;
      return {
        id: variant.id,
        product: {
          id: product.id,
          name: product.name,
          base_price: product.base_price,
          min_price: effectivePrice,
          max_price: effectivePrice,
          thumbnail: product.images[0]?.image_url ?? null,
          average_rating: averageRating,
          review_count: activeReviews.length,
          seller: {
            id: product.seller.id,
            shop_name: product.seller.shop_name,
            logo_image: product.seller.logo_image ?? null,
            approval_status: sellerApprovalStatus,
            suspended: product.seller.suspended,
            banned: product.seller.banned,
            created_at: product.seller.created_at.toISOString(),
          } satisfies IShoppingMallSeller.ISummary,
          category: {
            id: product.category.id,
            name: product.category.name,
            description: product.category.description,
            created_at: product.category.created_at.toISOString(),
            parent: product.category.parent
              ? ({
                  id: product.category.parent.id,
                  name: product.category.parent.name,
                  description: product.category.parent.description,
                  created_at: product.category.parent.created_at.toISOString(),
                  parent: null,
                } satisfies IShoppingMallCategory.ISummary)
              : null,
          } satisfies IShoppingMallCategory.ISummary,
          out_of_stock: stockQuantity === 0,
          created_at: product.created_at.toISOString(),
        } satisfies IShoppingMallProduct.ISummary,
        sku_code: variant.sku_code,
        option_values: typia.assert<{
          [key: string]: string;
        }>(variant.option_values as unknown as object),
        price: variant.price,
        stock_quantity: stockQuantity,
        created_at: variant.created_at.toISOString(),
      } satisfies IShoppingMallProductVariant.ISummary;
    }),
    average_rating: averageRating,
    total_review_count: activeReviews.length,
    created_at: product.created_at.toISOString(),
    updated_at: product.updated_at.toISOString(),
  } satisfies IShoppingMallProduct;
}
