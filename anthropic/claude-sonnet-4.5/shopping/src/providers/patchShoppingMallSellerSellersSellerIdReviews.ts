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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerSellersSellerIdReviews(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  if (props.seller.id !== props.sellerId) {
    throw new HttpException(
      "Forbidden: Cannot access other seller's reviews",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    shopping_mall_sale: {
      shopping_mall_seller_id: props.sellerId,
      deleted_at: null,
    },
  };

  if (props.body.sale_id) {
    where.shopping_mall_sale_id = props.body.sale_id;
  }

  if (props.body.sku_id) {
    where.shopping_mall_sale_sku_id = props.body.sku_id;
  }

  if (props.body.buyer_id) {
    where.shopping_mall_buyer_id = props.body.buyer_id;
  }

  if (props.body.status) {
    where.status = props.body.status;
  }

  if (
    props.body.min_rating !== undefined ||
    props.body.max_rating !== undefined
  ) {
    where.star_rating = {};
    if (props.body.min_rating !== undefined) {
      (where.star_rating as Record<string, unknown>).gte =
        props.body.min_rating;
    }
    if (props.body.max_rating !== undefined) {
      (where.star_rating as Record<string, unknown>).lte =
        props.body.max_rating;
    }
  }

  if (props.body.verified_purchase_only === true) {
    where.is_verified_purchase = true;
  }

  if (props.body.is_anonymous !== undefined) {
    where.is_anonymous = props.body.is_anonymous;
  }

  if (props.body.start_date || props.body.end_date) {
    where.created_at = {};
    if (props.body.start_date) {
      (where.created_at as Record<string, unknown>).gte = new Date(
        props.body.start_date,
      );
    }
    if (props.body.end_date) {
      (where.created_at as Record<string, unknown>).lt = new Date(
        props.body.end_date,
      );
    }
  }

  if (props.body.search_text) {
    where.OR = [
      { review_title: { contains: props.body.search_text } },
      { review_body: { contains: props.body.search_text } },
    ];
  }

  if (props.body.has_seller_response === true) {
    where.shopping_mall_review_seller_responses = {
      some: {},
    };
  } else if (props.body.has_seller_response === false) {
    where.shopping_mall_review_seller_responses = {
      none: {},
    };
  }

  if (props.body.has_images === true) {
    where.shopping_mall_review_images = {
      some: {},
    };
  }

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const orderBy: Record<string, string> = {};
  if (sortBy === "created_at") {
    orderBy.created_at = sortOrder;
  } else if (sortBy === "rating") {
    orderBy.star_rating = sortOrder;
  } else if (sortBy === "helpfulness") {
    orderBy.helpfulness_vote_count = sortOrder;
  }

  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where,
      skip,
      take: limit,
      orderBy,
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
    MyGlobal.prisma.shopping_mall_reviews.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
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
        phone_number: review.buyer.phone_number ?? null,
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
      status: review.status as "approved" | "rejected" | "pending_moderation",
      is_verified_purchase: review.is_verified_purchase,
      is_anonymous: review.is_anonymous,
      helpfulness_vote_count: review.helpfulness_vote_count,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
    })),
  };
}
