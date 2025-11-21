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

export async function patchShoppingMallReviews(props: {
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions based on request parameters
  const whereConditions: Prisma.shopping_mall_reviewsWhereInput = {
    deleted_at: null,
  };

  // Text search on title and content
  if (props.body.search) {
    whereConditions.OR = [
      { title: { contains: props.body.search } },
      { content: { contains: props.body.search } },
    ];
  }

  // Actor type filter
  if (props.body.actor_type) {
    whereConditions.actor_type = props.body.actor_type;
  }

  // Status filter
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Rating range filter
  if (
    props.body.min_rating !== undefined ||
    props.body.max_rating !== undefined
  ) {
    whereConditions.overall_rating = {};
    if (props.body.min_rating !== undefined) {
      whereConditions.overall_rating.gte = props.body.min_rating;
    }
    if (props.body.max_rating !== undefined) {
      whereConditions.overall_rating.lte = props.body.max_rating;
    }
  }

  // Product ID filter
  if (props.body.product_id) {
    whereConditions.shopping_mall_product_id = props.body.product_id;
  }

  // Seller ID filter
  if (props.body.seller_id) {
    whereConditions.shopping_mall_seller_id = props.body.seller_id;
  }

  // Build order by clause
  const orderBy: Record<string, unknown> = {};
  const sortField = props.body.sort_by || "created_at";
  const sortOrder = props.body.order || "desc";
  orderBy[sortField] = sortOrder;

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_reviews.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_reviews.count({
      where: whereConditions,
    }),
  ]);

  // Transform data to match ISummary interface
  const transformedData = data.map((review) => ({
    id: review.id,
    actor_type: review.actor_type,
    title: review.title,
    overall_rating: review.overall_rating,
    status: typia.assert<"pending" | "approved" | "rejected" | "flagged">(
      review.status,
    ),
    helpful_count: review.helpful_count,
    verified_purchase: review.verified_purchase,
    created_at: toISOStringSafe(review.created_at),
    updated_at: review.updated_at
      ? toISOStringSafe(review.updated_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
