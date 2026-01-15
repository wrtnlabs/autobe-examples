import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallProductReviewAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        rating: true,
        title: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        vote_count: true,
        verified_purchase: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            category: {
              select: {
                id: true,
                name: true,
                brandId: true,
              },
            },
            shopping_mall_product_secondary_categories: {
              select: {
                category: true,
              },
            },
            shopping_mall_product_images: {
              select: {
                url: true,
                is_primary: true,
                display_order: true,
              },
            },
            shopping_mall_product_reviews: {
              select: {
                rating: true,
              },
            },
            shopping_mall_product_view_stats: {
              select: {
                view_count: true,
              },
            },
            shopping_mall_product_sales_stats: {
              select: {
                count: true,
              },
            },
            shopping_mall_product_snapshots: {
              select: {
                snapshot_number: true,
              },
            },
            shopping_mall_product_variants: {
              select: {
                quantity: true,
              },
            },
          },
        },
        shopping_mall_review_votes: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_flags: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_moderation_logs: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_images: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_replies: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductReview.ISummary> {
    return {
      id: input.id,
      customerId: input.customer.id,
      productId: input.product.id,
      rating: input.rating,
      status:
        input.status === "pending"
          ? "pending"
          : input.status === "approved"
            ? "approved"
            : input.status === "rejected"
              ? "rejected"
              : "pending",
      title: input.title || "",
      contentPreview: input.body.substring(0, 200),
      helpfulnessScore: input.vote_count,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      author: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
    };
  }
}
