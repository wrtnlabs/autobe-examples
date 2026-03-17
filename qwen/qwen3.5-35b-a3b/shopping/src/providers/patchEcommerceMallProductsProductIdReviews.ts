import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallReviewAtSummaryTransformer } from "../transformers/EcommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    product_id: props.productId,
    deleted_at: null,
  };
  // Apply optional filters from body
  if (props.body.customer_id) {
    whereInput.customer_id = props.body.customer_id;
  }
  if (props.body.order_id) {
    whereInput.order_id = props.body.order_id;
  }
  if (props.body.min_rating !== undefined) {
    whereInput.rating = { gte: props.body.min_rating };
  }
  if (props.body.max_rating !== undefined) {
    if (props.body.min_rating !== undefined) {
      whereInput.rating = {
        gte: props.body.min_rating,
        lte: props.body.max_rating,
      };
    } else {
      whereInput.rating = { lte: props.body.max_rating };
    }
  }
  if (props.body.is_verified_purchase !== undefined) {
    whereInput.is_verified_purchase = props.body.is_verified_purchase;
  }
  if (props.body.search) {
    whereInput.body = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.from_created_at) {
    whereInput.created_at = {
      gte: new Date(props.body.from_created_at),
    };
  }
  if (props.body.to_created_at) {
    if (props.body.from_created_at) {
      whereInput.created_at = {
        gte: new Date(props.body.from_created_at),
        lte: new Date(props.body.to_created_at),
      };
    } else {
      whereInput.created_at = { lte: new Date(props.body.to_created_at) };
    }
  }
  // Build ORDER BY
  const orderByInput: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput =
    props.body.sort_by === "rating"
      ? { rating: props.body.direction ?? ("desc" as const) }
      : { created_at: props.body.direction ?? ("desc" as const) };
  // Cursor-based pagination
  let cursorInput: Prisma.ecommerce_mall_reviewsWhereInput = { ...whereInput };
  if (props.body.cursor) {
    // Cursor format: created_at|id
    const [cursorCreatedAt, cursorId] = props.body.cursor.split("|");
    const andConditions: Prisma.ecommerce_mall_reviewsWhereInput[] = [
      cursorInput,
      {
        created_at: {
          lt: new Date(cursorCreatedAt),
        },
      },
    ];
    // Handle same timestamp case
    andConditions.push({
      id: {
        lt: cursorId,
      },
    });
    cursorInput = {
      AND: andConditions,
    };
  }
  // Query reviews with cursor pagination
  const data = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: cursorInput,
    take: limit + 1, // +1 to check if there's more
    orderBy: orderByInput,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Check if we need next cursor
  const hasMore = data.length > limit;
  const finalData = hasMore ? data.slice(0, limit) : data;
  // Count total records (without cursor filter for accurate total)
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  // Build next cursor for last item
  const nextCursor = hasMore
    ? `${toISOStringSafe(finalData[limit - 1].created_at)}|${finalData[limit - 1].id}`
    : undefined;
  return {
    data: await ArrayUtil.asyncMap(
      finalData,
      EcommerceMallReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
