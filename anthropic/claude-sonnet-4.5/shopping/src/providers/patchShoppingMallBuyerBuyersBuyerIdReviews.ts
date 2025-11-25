import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerBuyersBuyerIdReviews(props: {
  buyer: BuyerPayload;
  buyerId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  if (props.buyer.id !== props.buyerId) {
    throw new HttpException("You can only access your own reviews", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where: {
        shopping_mall_buyer_id: props.buyerId,
        ...(props.body.sale_id && {
          shopping_mall_sale_id: props.body.sale_id,
        }),
        ...(props.body.sku_id && {
          shopping_mall_sale_sku_id: props.body.sku_id,
        }),
        ...(props.body.status && {
          status: props.body.status,
        }),
        ...((props.body.min_rating !== undefined ||
          props.body.max_rating !== undefined) && {
          star_rating: {
            ...(props.body.min_rating !== undefined && {
              gte: props.body.min_rating,
            }),
            ...(props.body.max_rating !== undefined && {
              lte: props.body.max_rating,
            }),
          },
        }),
        ...(props.body.verified_purchase_only === true && {
          is_verified_purchase: true,
        }),
        ...(props.body.is_anonymous !== undefined && {
          is_anonymous: props.body.is_anonymous,
        }),
        ...((props.body.start_date || props.body.end_date) && {
          created_at: {
            ...(props.body.start_date && { gte: props.body.start_date }),
            ...(props.body.end_date && { lt: props.body.end_date }),
          },
        }),
        ...(props.body.search_text && {
          OR: [
            {
              review_title: {
                contains: props.body.search_text,
                mode: "insensitive",
              },
            },
            {
              review_body: {
                contains: props.body.search_text,
                mode: "insensitive",
              },
            },
          ],
        }),
        ...(props.body.seller_id && {
          sale: {
            shopping_mall_seller_id: props.body.seller_id,
          },
        }),
        ...(props.body.has_images === true && {
          shopping_mall_review_images: {
            some: {},
          },
        }),
      },
      skip,
      take: limit,
      orderBy:
        sortBy === "created_at"
          ? { created_at: sortOrder }
          : sortBy === "rating"
            ? { star_rating: sortOrder }
            : sortBy === "helpfulness"
              ? { helpfulness_vote_count: sortOrder }
              : { created_at: "desc" },
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
        shopping_mall_buyer_id: props.buyerId,
        ...(props.body.sale_id && {
          shopping_mall_sale_id: props.body.sale_id,
        }),
        ...(props.body.sku_id && {
          shopping_mall_sale_sku_id: props.body.sku_id,
        }),
        ...(props.body.status && {
          status: props.body.status,
        }),
        ...((props.body.min_rating !== undefined ||
          props.body.max_rating !== undefined) && {
          star_rating: {
            ...(props.body.min_rating !== undefined && {
              gte: props.body.min_rating,
            }),
            ...(props.body.max_rating !== undefined && {
              lte: props.body.max_rating,
            }),
          },
        }),
        ...(props.body.verified_purchase_only === true && {
          is_verified_purchase: true,
        }),
        ...(props.body.is_anonymous !== undefined && {
          is_anonymous: props.body.is_anonymous,
        }),
        ...((props.body.start_date || props.body.end_date) && {
          created_at: {
            ...(props.body.start_date && { gte: props.body.start_date }),
            ...(props.body.end_date && { lt: props.body.end_date }),
          },
        }),
        ...(props.body.search_text && {
          OR: [
            {
              review_title: {
                contains: props.body.search_text,
                mode: "insensitive",
              },
            },
            {
              review_body: {
                contains: props.body.search_text,
                mode: "insensitive",
              },
            },
          ],
        }),
        ...(props.body.seller_id && {
          sale: {
            shopping_mall_seller_id: props.body.seller_id,
          },
        }),
        ...(props.body.has_images === true && {
          shopping_mall_review_images: {
            some: {},
          },
        }),
      },
    }),
  ]);

  return {
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
        phone_number: review.buyer.phone_number ?? null,
      },
      sale: {
        id: review.sale.id,
        code: review.sale.code,
        title: review.sale.title,
        status: typia.assert<
          "draft" | "pending_approval" | "published" | "suspended" | "archived"
        >(review.sale.status),
        condition: typia.assert<"new" | "refurbished" | "used">(
          review.sale.condition,
        ),
        brand: review.sale.brand ?? null,
        short_description: review.sale.short_description ?? null,
        price: 0,
        thumbnail_url: null,
        return_policy_days: review.sale.return_policy_days,
        warranty_info: review.sale.warranty_info ?? null,
        created_at: toISOStringSafe(review.sale.created_at),
        updated_at: toISOStringSafe(review.sale.updated_at),
        deleted_at: review.sale.deleted_at
          ? toISOStringSafe(review.sale.deleted_at)
          : null,
        seller: {
          id: review.sale.seller.id,
          store_name: review.sale.seller.store_name,
          email: review.sale.seller.email,
          status: typia.assert<
            "pending" | "approved" | "rejected" | "suspended"
          >(review.sale.seller.status),
          email_verified: review.sale.seller.email_verified,
        },
        category: {
          id: review.sale.category.id,
          name: review.sale.category.name,
          slug: review.sale.category.slug,
          description: review.sale.category.description ?? null,
          image_url: review.sale.category.image_url ?? null,
          parent_id: review.sale.category.parent_id ?? null,
          status: review.sale.category.status,
          display_order: review.sale.category.display_order,
          product_count: review.sale.category.product_count,
          created_at: toISOStringSafe(review.sale.category.created_at),
          updated_at: toISOStringSafe(review.sale.category.updated_at),
        },
      },
      star_rating: review.star_rating,
      review_title: review.review_title ?? null,
      review_body: review.review_body ?? null,
      status: typia.assert<"approved" | "rejected" | "pending_moderation">(
        review.status,
      ),
      is_verified_purchase: review.is_verified_purchase,
      is_anonymous: review.is_anonymous,
      helpfulness_vote_count: review.helpfulness_vote_count,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
