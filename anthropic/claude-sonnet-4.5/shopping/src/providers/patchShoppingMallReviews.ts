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

export async function patchShoppingMallReviews(props: {
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const {
    page = 1,
    limit = 20,
    sale_id,
    sku_id,
    seller_id,
    buyer_id,
    status,
    min_rating,
    max_rating,
    verified_purchase_only,
    is_anonymous,
    start_date,
    end_date,
    search_text,
    sort_by = "created_at",
    sort_order = "desc",
    has_seller_response,
    has_images,
  } = props.body;

  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {
      deleted_at: null,
      status: status ?? "approved",
    };

    if (sale_id) {
      conditions.shopping_mall_sale_id = sale_id;
    }

    if (sku_id) {
      conditions.shopping_mall_sale_sku_id = sku_id;
    }

    if (buyer_id) {
      conditions.shopping_mall_buyer_id = buyer_id;
    }

    if (seller_id) {
      conditions.sale = {
        shopping_mall_seller_id: seller_id,
      };
    }

    if (min_rating !== undefined || max_rating !== undefined) {
      const ratingCondition: Record<string, unknown> = {};
      if (min_rating !== undefined) {
        ratingCondition.gte = min_rating;
      }
      if (max_rating !== undefined) {
        ratingCondition.lte = max_rating;
      }
      conditions.star_rating = ratingCondition;
    }

    if (verified_purchase_only === true) {
      conditions.is_verified_purchase = true;
    }

    if (is_anonymous !== undefined) {
      conditions.is_anonymous = is_anonymous;
    }

    if (start_date || end_date) {
      const dateCondition: Record<string, unknown> = {};
      if (start_date) {
        dateCondition.gte = new Date(start_date);
      }
      if (end_date) {
        dateCondition.lt = new Date(end_date);
      }
      conditions.created_at = dateCondition;
    }

    if (search_text) {
      conditions.OR = [
        { review_body: { contains: search_text, mode: "insensitive" } },
        { review_title: { contains: search_text, mode: "insensitive" } },
      ];
    }

    if (has_seller_response !== undefined) {
      conditions.seller_responses = has_seller_response
        ? { some: { deleted_at: null } }
        : { none: {} };
    }

    if (has_images !== undefined) {
      conditions.review_images = has_images ? { some: {} } : { none: {} };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const orderByCondition =
    sort_by === "rating"
      ? { star_rating: sort_order }
      : sort_by === "helpfulness"
        ? { helpfulness_vote_count: sort_order }
        : { created_at: sort_order };

  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
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

  const saleIds = [...new Set(reviews.map((r) => r.shopping_mall_sale_id))];

  const skuData = await MyGlobal.prisma.shopping_mall_sale_skus.findMany({
    where: {
      shopping_mall_sale_id: { in: saleIds },
      enabled: true,
    },
    select: {
      shopping_mall_sale_id: true,
      base_price: true,
    },
  });

  const imageData = await MyGlobal.prisma.shopping_mall_sale_images.findMany({
    where: {
      shopping_mall_sale_id: { in: saleIds },
      shopping_mall_sale_sku_id: null,
    },
    orderBy: {
      display_order: "asc",
    },
    select: {
      shopping_mall_sale_id: true,
      url_small: true,
    },
  });

  const priceMap = new Map<string, number>();
  for (const saleId of saleIds) {
    const skusForSale = skuData.filter(
      (s) => s.shopping_mall_sale_id === saleId,
    );
    if (skusForSale.length > 0) {
      priceMap.set(saleId, Math.min(...skusForSale.map((s) => s.base_price)));
    } else {
      priceMap.set(saleId, 0);
    }
  }

  const thumbnailMap = new Map<string, string | null>();
  for (const saleId of saleIds) {
    const imagesForSale = imageData.filter(
      (i) => i.shopping_mall_sale_id === saleId,
    );
    thumbnailMap.set(
      saleId,
      imagesForSale.length > 0 ? imagesForSale[0].url_small : null,
    );
  }

  const data: IShoppingMallReview.ISummary[] = reviews.map((review) => {
    const minPrice = priceMap.get(review.shopping_mall_sale_id) ?? 0;
    const thumbnailUrl = thumbnailMap.get(review.shopping_mall_sale_id) ?? null;

    return {
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
        price: minPrice,
        thumbnail_url: thumbnailUrl,
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
      status: typia.assert<"pending_moderation" | "approved" | "rejected">(
        review.status,
      ),
      is_verified_purchase: review.is_verified_purchase,
      is_anonymous: review.is_anonymous,
      helpfulness_vote_count: review.helpfulness_vote_count,
      created_at: toISOStringSafe(review.created_at),
      updated_at: toISOStringSafe(review.updated_at),
      deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
    };
  });

  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
