import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function getShoppingMallReviewsReviewId(props: {
  reviewId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReview> {
  const review = await MyGlobal.prisma.shopping_mall_reviews.findUnique({
    where: { id: props.reviewId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          status: true,
          stock_quantity: true,
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              display_order: true,
              active: true,
              parent_id: true,
              created_at: true,
              updated_at: true,
              parent: true,
            },
          },
          seller: {
            select: {
              id: true,
              business_name: true,
              contact_person: true,
              email: true,
              status: true,
            },
          },
        },
      },
      seller: {
        select: {
          id: true,
          business_name: true,
          contact_person: true,
          email: true,
          status: true,
        },
      },
    },
  });

  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  // Build the product summary if product exists
  const productSummary = review.product
    ? {
        id: review.product.id,
        name: review.product.name,
        price: review.product.price,
        status: review.product.status,
        stock_quantity: review.product.stock_quantity,
        category: {
          id: review.product.category.id,
          name: review.product.category.name,
          description: review.product.category.description ?? undefined,
          display_order: review.product.category.display_order,
          active: review.product.category.active,
          parent_id:
            review.product.category.parent_id !== null
              ? review.product.category.parent_id
              : typia.random<string & tags.Format<"uuid">>(),
          created_at: toISOStringSafe(review.product.category.created_at),
          updated_at: toISOStringSafe(review.product.category.updated_at),
          parent: review.product.category.parent
            ? {
                id: review.product.category.parent.id,
                name: review.product.category.parent.name,
                description:
                  review.product.category.parent.description ?? undefined,
                display_order: review.product.category.parent.display_order,
                active: review.product.category.parent.active,
                parent_id:
                  review.product.category.parent.parent_id !== null
                    ? review.product.category.parent.parent_id
                    : typia.random<string & tags.Format<"uuid">>(),
                created_at: toISOStringSafe(
                  review.product.category.parent.created_at,
                ),
                updated_at: toISOStringSafe(
                  review.product.category.parent.updated_at,
                ),
                parent: undefined,
              }
            : undefined,
        },
        seller: {
          id: review.product.seller.id,
          business_name: review.product.seller.business_name,
          contact_person: review.product.seller.contact_person,
          email: review.product.seller.email,
          status: review.product.seller.status,
        },
      }
    : undefined;

  // Build the seller summary if seller exists
  const sellerSummary = review.seller
    ? {
        id: review.seller.id,
        business_name: review.seller.business_name,
        contact_person: review.seller.contact_person,
        email: review.seller.email,
        status: review.seller.status,
      }
    : undefined;

  return {
    id: review.id,
    actor_type: review.actor_type,
    title: review.title,
    content: review.content,
    overall_rating: review.overall_rating,
    status: review.status,
    helpful_count: review.helpful_count,
    report_count: review.report_count,
    verified_purchase: review.verified_purchase,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at
      ? toISOStringSafe(review.deleted_at)
      : undefined,
    shopping_mall_product_id: review.shopping_mall_product_id ?? undefined,
    shopping_mall_seller_id: review.shopping_mall_seller_id ?? undefined,
    product: productSummary,
    seller: sellerSummary,
  };
}
