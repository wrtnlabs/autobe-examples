import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        base_price: true,
        created_at: true,
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
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
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
                parent: true,
              },
            } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
        variants: {
          select: {
            price: true,
            inventoryRecords: {
              select: {
                quantity_change: true,
              },
            },
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        images: {
          select: {
            image_url: true,
            display_order: true,
          },
        } satisfies Prisma.shopping_mall_product_imagesFindManyArgs,
        reviews: {
          select: {
            rating: true,
          },
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProduct.ISummary> {
    // Compute min/max price from variants
    const variantPrices = input.variants.map(
      (v) => v.price ?? input.base_price,
    );
    const min_price =
      variantPrices.length > 0 ? Math.min(...variantPrices) : input.base_price;
    const max_price =
      variantPrices.length > 0 ? Math.max(...variantPrices) : input.base_price;
    // Compute thumbnail from images (first by display_order)
    const sortedImages = [...input.images].sort(
      (a, b) => a.display_order - b.display_order,
    );
    const thumbnail =
      sortedImages.length > 0 ? sortedImages[0].image_url : undefined;
    // Compute average rating and review count from reviews
    const review_count = input.reviews.length;
    const average_rating =
      review_count > 0
        ? input.reviews.reduce((sum, r) => sum + r.rating, 0) / review_count
        : null;
    // Compute out_of_stock: sum inventoryRecords.quantity_change for each variant
    const out_of_stock =
      input.variants.length === 0 ||
      input.variants.every((v) => {
        const stock = v.inventoryRecords.reduce(
          (sum, r) => sum + r.quantity_change,
          0,
        );
        return stock <= 0;
      });
    // Inline seller transformation
    const transformSeller = (
      s: typeof input.seller,
    ): IShoppingMallSeller.ISummary => ({
      id: s.id,
      shop_name: s.shop_name,
      logo_image: s.logo_image,
      approval_status: s.approval_status as "pending" | "approved" | "rejected",
      suspended: s.suspended,
      banned: s.banned,
      created_at: s.created_at.toISOString(),
    });
    // Inline category transformation
    const transformCategory = async (
      cat: typeof input.category,
    ): Promise<IShoppingMallCategory.ISummary> => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      parent: cat.parent
        ? {
            id: cat.parent.id,
            name: cat.parent.name,
            description: cat.parent.description,
            parent: cat.parent.parent
              ? {
                  id: cat.parent.parent.id,
                  name: cat.parent.parent.name,
                  description: cat.parent.parent.description,
                  parent: null,
                  created_at: cat.parent.parent.created_at.toISOString(),
                }
              : null,
            created_at: cat.parent.created_at.toISOString(),
          }
        : null,
      created_at: cat.created_at.toISOString(),
    });
    return {
      id: input.id,
      name: input.name,
      base_price: input.base_price,
      min_price,
      max_price,
      thumbnail,
      average_rating,
      review_count,
      seller: transformSeller(input.seller),
      category: await transformCategory(input.category),
      out_of_stock,
      created_at: input.created_at.toISOString(),
    };
  }
}
