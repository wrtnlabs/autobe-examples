import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallProductAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_productsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        category: true,
        variants: {
          select: {
            price: true,
          },
        },
        productImages: {
          select: {
            image_url: true,
          },
        },
        productSnapshots: {
          select: {
            id: true,
          },
        },
        wishlistItems: {
          select: {
            id: true,
          },
        },
        orderItems: {
          select: {
            id: true,
          },
        },
        reviews: {
          select: {
            rating: true,
            deleted_at: true,
          },
        },
        seller: {
          select: {
            profile: {
              select: {
                name: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_productsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallProduct.ISummary> {
    const prices = input.variants
      .map((v) => v.price)
      .filter((p): p is number => p !== null);
    const basePrice = input.base_price;
    const min_price = prices.length > 0 ? Math.min(...prices) : basePrice!;
    const max_price = prices.length > 0 ? Math.max(...prices) : basePrice!;
    const primary_image_url = input.productImages[0]?.image_url ?? "";
    const seller_name = input.seller?.profile?.name ?? "";
    const activeReviews = input.reviews.filter((r) => r.deleted_at === null);
    const reviews_count = activeReviews.length;
    const average_rating =
      reviews_count > 0
        ? activeReviews.reduce((sum, r) => sum + r.rating, 0) / reviews_count
        : 0;
    return {
      id: input.id,
      name: input.name,
      min_price: min_price,
      max_price: max_price,
      primary_image_url: primary_image_url,
      seller_name: seller_name,
      average_rating: average_rating,
      reviews_count: reviews_count,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
