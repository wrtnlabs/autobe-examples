import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        created_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            phone_number: true,
            banned: true,
            created_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_customersFindManyArgs,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            created_at: true,
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
                    parent: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                      },
                    } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
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
                } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs,
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
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReview.ISummary> {
    // Build author if customer is not deleted
    const author =
      input.customer.deleted_at != null
        ? null
        : {
            id: input.customer.id,
            email: input.customer.email,
            displayName: input.customer.display_name ?? null,
            phoneNumber: input.customer.phone_number ?? null,
            banned: input.customer.banned,
            createdAt: input.customer.created_at.toISOString(),
          };
    // Build product if not deleted
    const product =
      input.product.deleted_at != null
        ? null
        : await (async () => {
            // Compute min/max price from variants
            const variantPrices = input.product.variants.map(
              (v) => v.price ?? input.product.base_price,
            );
            const min_price =
              variantPrices.length > 0
                ? Math.min(...variantPrices)
                : input.product.base_price;
            const max_price =
              variantPrices.length > 0
                ? Math.max(...variantPrices)
                : input.product.base_price;
            // Compute thumbnail from images (first by display_order)
            const sortedImages = [...input.product.images].sort(
              (a, b) => a.display_order - b.display_order,
            );
            const thumbnail =
              sortedImages.length > 0 ? sortedImages[0].image_url : undefined;
            // Compute average rating and review count
            const review_count = input.product.reviews.length;
            const average_rating =
              review_count > 0
                ? input.product.reviews.reduce((sum, r) => sum + r.rating, 0) /
                  review_count
                : null;
            // Compute out_of_stock from inventory records
            const out_of_stock =
              input.product.variants.length === 0 ||
              input.product.variants.every(
                (v) =>
                  v.inventoryRecords.reduce(
                    (sum, ir) => sum + ir.quantity_change,
                    0,
                  ) === 0,
              );
            // Transform category recursively
            const transformCategory = async (
              cat: typeof input.product.category,
            ): Promise<IShoppingMallCategory.ISummary> => {
              return {
                id: cat.id,
                name: cat.name,
                description: cat.description ?? null,
                parent: cat.parent
                  ? await transformCategory(cat.parent as typeof cat)
                  : null,
                created_at: cat.created_at.toISOString(),
              };
            };
            return {
              id: input.product.id,
              name: input.product.name,
              base_price: input.product.base_price,
              min_price,
              max_price,
              thumbnail,
              average_rating,
              review_count,
              seller: {
                id: input.product.seller.id,
                shop_name: input.product.seller.shop_name,
                logo_image: input.product.seller.logo_image,
                approval_status: input.product.seller.approval_status as
                  | "pending"
                  | "approved"
                  | "rejected",
                suspended: input.product.seller.suspended,
                banned: input.product.seller.banned,
                created_at: input.product.seller.created_at.toISOString(),
              } satisfies IShoppingMallSeller.ISummary,
              category: await transformCategory(input.product.category),
              out_of_stock,
              created_at: input.product.created_at.toISOString(),
            } satisfies IShoppingMallProduct.ISummary;
          })();
    return {
      id: input.id,
      rating: input.rating,
      content: input.content,
      author,
      product,
      created_at: input.created_at.toISOString(),
    };
  }
}
