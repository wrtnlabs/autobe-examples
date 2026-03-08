import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.IRequest;
}): Promise<IPageIShoppingMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with all filters
  const whereInput: Prisma.shopping_mall_reviewsWhereInput = {
    shopping_mall_product_id: props.productId,
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
    ...(props.body.customerId && {
      shopping_mall_customer_id: props.body.customerId,
    }),
    ...(props.body.orderId && { shopping_mall_order_id: props.body.orderId }),
    ...(props.body.ratingMin !== undefined && {
      rating: { gte: props.body.ratingMin },
    }),
    ...(props.body.ratingMax !== undefined && {
      rating: {
        ...(props.body.ratingMin !== undefined
          ? { gte: props.body.ratingMin }
          : {}),
        lte: props.body.ratingMax,
      },
    }),
    ...(props.body.createdFrom && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
    ...(props.body.search && {
      content: { contains: props.body.search, mode: "insensitive" },
    }),
  };
  // Query reviews with pagination
  const reviews = await MyGlobal.prisma.shopping_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallReviewAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.shopping_mall_reviews.count({
    where: whereInput,
  });
  // Transform results using transformer
  const data = await ArrayUtil.asyncMap(
    reviews,
    ShoppingMallReviewAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIShoppingMallReview.ISummary;
}
