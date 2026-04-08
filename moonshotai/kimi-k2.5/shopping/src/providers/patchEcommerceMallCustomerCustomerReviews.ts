import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewAtSummaryTransformer } from "../transformers/EcommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause based on filters
  const where: Prisma.ecommerce_mall_reviewsWhereInput = {
    customer_id: props.customer.id,
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
    ...(props.body.productId && { product_id: props.body.productId }),
    ...(props.body.minRating !== null && {
      rating: { gte: props.body.minRating },
    }),
    ...(props.body.maxRating !== null && {
      rating: { lte: props.body.maxRating },
    }),
    ...(props.body.createdAfter && {
      created_at: { gt: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore && {
      created_at: { lt: new Date(props.body.createdBefore) },
    }),
    ...(props.body.search && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
  };
  // Determine sort order
  const orderBy: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "highestRating"
        ? { rating: "desc" }
        : props.body.sort === "lowestRating"
          ? { rating: "asc" }
          : { created_at: "desc" };
  // Fetch reviews with pagination
  const reviews = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({ where });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    reviews,
    EcommerceMallReviewAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
