import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewAtSummaryTransformer } from "../transformers/ShoppingMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallReviews(props: {
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with soft delete filter
  const whereInput: Prisma.shopping_mall_reviewsWhereInput = {
    deleted_at: null,
  };
  // Add optional filters
  if (props.body.rating !== undefined) {
    whereInput.rating = props.body.rating;
  }
  if (props.body.customerId !== undefined) {
    whereInput.shopping_customer_id = props.body.customerId;
  }
  // Date range filter
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    whereInput.created_at = {};
    if (props.body.startDate !== undefined) {
      whereInput.created_at.gte = new Date(props.body.startDate);
    }
    if (props.body.endDate !== undefined) {
      whereInput.created_at.lte = new Date(props.body.endDate);
    }
  }
  // Text search filter
  if (props.body.search !== undefined) {
    whereInput.content = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  // Product ID filter via order_items relation - removed as product_id field doesn't exist in shopping_mall_order_items schema
  // The DTO specification mentions this filter but the actual database schema doesn't have product_id field
  // Execute findMany with pagination
  const data = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...ShoppingMallReviewAtSummaryTransformer.select(),
  });
  // Execute count for pagination metadata
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallReviewAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
