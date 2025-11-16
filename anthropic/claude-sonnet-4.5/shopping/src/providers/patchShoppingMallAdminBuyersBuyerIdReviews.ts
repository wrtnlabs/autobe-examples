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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminBuyersBuyerIdReviews(props: {
  admin: AdminPayload;
  buyerId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      shopping_mall_buyer_id: props.buyerId,
    };

    if (props.body.sale_id) {
      conditions.shopping_mall_sale_id = props.body.sale_id;
    }

    if (props.body.sku_id) {
      conditions.shopping_mall_sale_sku_id = props.body.sku_id;
    }

    if (props.body.seller_id) {
      conditions.sale = {
        shopping_mall_seller_id: props.body.seller_id,
      };
    }

    if (props.body.status) {
      conditions.status = props.body.status;
    }

    if (
      props.body.min_rating !== undefined ||
      props.body.max_rating !== undefined
    ) {
      const ratingFilter: Record<string, unknown> = {};
      if (props.body.min_rating !== undefined) {
        ratingFilter.gte = props.body.min_rating;
      }
      if (props.body.max_rating !== undefined) {
        ratingFilter.lte = props.body.max_rating;
      }
      conditions.star_rating = ratingFilter;
    }

    if (props.body.verified_purchase_only !== undefined) {
      conditions.is_verified_purchase = props.body.verified_purchase_only;
    }

    if (props.body.is_anonymous !== undefined) {
      conditions.is_anonymous = props.body.is_anonymous;
    }

    if (props.body.start_date || props.body.end_date) {
      const dateFilter: Record<string, unknown> = {};
      if (props.body.start_date) {
        dateFilter.gte = new Date(props.body.start_date);
      }
      if (props.body.end_date) {
        dateFilter.lt = new Date(props.body.end_date);
      }
      conditions.created_at = dateFilter;
    }

    if (props.body.search_text) {
      conditions.OR = [
        { review_title: { contains: props.body.search_text } },
        { review_body: { contains: props.body.search_text } },
      ];
    }

    if (props.body.has_seller_response !== undefined) {
      if (props.body.has_seller_response) {
        conditions.shopping_mall_review_seller_responses = { some: {} };
      } else {
        conditions.shopping_mall_review_seller_responses = { none: {} };
      }
    }

    if (props.body.has_images !== undefined) {
      if (props.body.has_images) {
        conditions.shopping_mall_review_images = { some: {} };
      } else {
        conditions.shopping_mall_review_images = { none: {} };
      }
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByField =
    sortBy === "helpfulness" ? "helpfulness_vote_count" : sortBy;
  const orderBy = { [orderByField]: sortOrder };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where: whereCondition,
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
    MyGlobal.prisma.shopping_mall_reviews.count({
      where: whereCondition,
    }),
  ]);

  const saleIds = [
    ...new Set(data.map((review) => review.shopping_mall_sale_id)),
  ];
  const skuPrices = await MyGlobal.prisma.shopping_mall_sale_skus.groupBy({
    by: ["shopping_mall_sale_id"],
    where: {
      shopping_mall_sale_id: { in: saleIds },
      enabled: true,
    },
    _min: {
      base_price: true,
    },
  });

  const priceMap = new Map(
    skuPrices.map((item) => [
      item.shopping_mall_sale_id,
      item._min.base_price ?? 0,
    ]),
  );

  return {
    data: data.map((review) => ({
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
          "suspended" | "draft" | "pending_approval" | "published" | "archived"
        >(review.sale.status),
        condition: typia.assert<"new" | "refurbished" | "used">(
          review.sale.condition,
        ),
        brand: review.sale.brand ?? null,
        short_description: review.sale.short_description ?? null,
        price: priceMap.get(review.shopping_mall_sale_id) ?? 0,
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
          status: typia.assert<"active" | "inactive">(
            review.sale.category.status,
          ),
          display_order: review.sale.category.display_order,
          product_count: review.sale.category.product_count,
          created_at: toISOStringSafe(review.sale.category.created_at),
          updated_at: toISOStringSafe(review.sale.category.updated_at),
        },
      },
      star_rating: review.star_rating,
      review_title: review.review_title ?? null,
      review_body: review.review_body ?? null,
      status: typia.assert<"pending_moderation" | "approved" | "rejected">(
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
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
