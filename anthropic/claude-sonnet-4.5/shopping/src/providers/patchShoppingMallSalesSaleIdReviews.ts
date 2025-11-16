import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";

export async function patchShoppingMallSalesSaleIdReviews(props: {
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where: {
        shopping_mall_sale_id: props.saleId,
        deleted_at: null,
        ...(props.body.status && { status: props.body.status }),
        ...(props.body.sku_id && {
          shopping_mall_sale_sku_id: props.body.sku_id,
        }),
        ...(props.body.buyer_id && {
          shopping_mall_buyer_id: props.body.buyer_id,
        }),
        ...(props.body.is_anonymous !== undefined && {
          is_anonymous: props.body.is_anonymous,
        }),
        ...(props.body.verified_purchase_only && {
          is_verified_purchase: true,
        }),
        ...(props.body.has_seller_response !== undefined && {
          shopping_mall_review_seller_responses: props.body.has_seller_response
            ? { isNot: null }
            : { is: null },
        }),
        ...(props.body.has_images && {
          shopping_mall_review_images: { some: {} },
        }),
        ...((props.body.min_rating || props.body.max_rating) && {
          star_rating: {
            ...(props.body.min_rating && { gte: props.body.min_rating }),
            ...(props.body.max_rating && { lte: props.body.max_rating }),
          },
        }),
        ...((props.body.start_date || props.body.end_date) && {
          created_at: {
            ...(props.body.start_date && {
              gte: new Date(props.body.start_date),
            }),
            ...(props.body.end_date && { lt: new Date(props.body.end_date) }),
          },
        }),
        ...(props.body.search_text && {
          OR: [
            {
              review_title: {
                contains: props.body.search_text,
                mode: "insensitive" as const,
              },
            },
            {
              review_body: {
                contains: props.body.search_text,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
        ...(props.body.seller_id && {
          sale: {
            shopping_mall_seller_id: props.body.seller_id,
          },
        }),
      },
      skip,
      take: limit,
      orderBy:
        sortBy === "helpfulness"
          ? { helpfulness_vote_count: sortOrder }
          : sortBy === "rating"
            ? { star_rating: sortOrder }
            : { created_at: sortOrder },
      include: {
        buyer: true,
        sale: {
          include: {
            seller: true,
            category: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_reviews.count({
      where: {
        shopping_mall_sale_id: props.saleId,
        deleted_at: null,
        ...(props.body.status && { status: props.body.status }),
        ...(props.body.sku_id && {
          shopping_mall_sale_sku_id: props.body.sku_id,
        }),
        ...(props.body.buyer_id && {
          shopping_mall_buyer_id: props.body.buyer_id,
        }),
        ...(props.body.is_anonymous !== undefined && {
          is_anonymous: props.body.is_anonymous,
        }),
        ...(props.body.verified_purchase_only && {
          is_verified_purchase: true,
        }),
        ...(props.body.has_seller_response !== undefined && {
          shopping_mall_review_seller_responses: props.body.has_seller_response
            ? { isNot: null }
            : { is: null },
        }),
        ...(props.body.has_images && {
          shopping_mall_review_images: { some: {} },
        }),
        ...((props.body.min_rating || props.body.max_rating) && {
          star_rating: {
            ...(props.body.min_rating && { gte: props.body.min_rating }),
            ...(props.body.max_rating && { lte: props.body.max_rating }),
          },
        }),
        ...((props.body.start_date || props.body.end_date) && {
          created_at: {
            ...(props.body.start_date && {
              gte: new Date(props.body.start_date),
            }),
            ...(props.body.end_date && { lt: new Date(props.body.end_date) }),
          },
        }),
        ...(props.body.search_text && {
          OR: [
            {
              review_title: {
                contains: props.body.search_text,
                mode: "insensitive" as const,
              },
            },
            {
              review_body: {
                contains: props.body.search_text,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
        ...(props.body.seller_id && {
          sale: {
            shopping_mall_seller_id: props.body.seller_id,
          },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: reviews.map((review) => ({
      id: review.id,
      shopping_mall_buyer_id: review.shopping_mall_buyer_id,
      shopping_mall_sale_id: review.shopping_mall_sale_id,
      shopping_mall_sale_sku_id: review.shopping_mall_sale_sku_id,
      shopping_mall_order_id: review.shopping_mall_order_id,
      buyer: {
        id: review.buyer.id,
        email: review.buyer.email,
        full_name: review.buyer.full_name,
        phone_number: review.buyer.phone_number ?? undefined,
      },
      sale: {
        id: review.sale.id,
        code: review.sale.code,
        title: review.sale.title,
        status: review.sale.status as
          | "draft"
          | "pending_approval"
          | "published"
          | "suspended"
          | "archived",
        condition: review.sale.condition as "new" | "refurbished" | "used",
        brand: review.sale.brand ?? undefined,
        short_description: review.sale.short_description ?? undefined,
        price: 0,
        thumbnail_url: undefined,
        return_policy_days: review.sale.return_policy_days,
        warranty_info: review.sale.warranty_info ?? undefined,
        created_at: toISOStringSafe(review.sale.created_at),
        updated_at: toISOStringSafe(review.sale.updated_at),
        deleted_at: review.sale.deleted_at
          ? toISOStringSafe(review.sale.deleted_at)
          : undefined,
        seller: {
          id: review.sale.seller.id,
          store_name: review.sale.seller.store_name,
          email: review.sale.seller.email,
          status: review.sale.seller.status as
            | "pending"
            | "approved"
            | "rejected"
            | "suspended",
          email_verified: review.sale.seller.email_verified,
        },
        category: {
          id: review.sale.category.id,
          name: review.sale.category.name,
          slug: review.sale.category.slug,
          description: review.sale.category.description ?? undefined,
          image_url: review.sale.category.image_url ?? undefined,
          parent_id: review.sale.category.parent_id ?? undefined,
          status: review.sale.category.status,
          display_order: review.sale.category.display_order,
          product_count: review.sale.category.product_count,
          created_at: toISOStringSafe(review.sale.category.created_at),
          updated_at: toISOStringSafe(review.sale.category.updated_at),
        },
      },
      star_rating: review.star_rating,
      review_title: review.review_title ?? undefined,
      review_body: review.review_body ?? undefined,
      status: review.status as "pending_moderation" | "approved" | "rejected",
      is_verified_purchase: review.is_verified_purchase,
      is_anonymous: review.is_anonymous,
      helpfulness_vote_count: review.helpfulness_vote_count,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      deleted_at: review.deleted_at
        ? toISOStringSafe(review.deleted_at)
        : undefined,
    })),
  };
}
