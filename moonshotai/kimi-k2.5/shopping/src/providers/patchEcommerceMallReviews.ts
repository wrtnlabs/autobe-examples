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
import { EcommerceMallReviewAtSummaryTransformer } from "../transformers/EcommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallReviews(props: {
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    ...(props.body.productId !== null && { product_id: props.body.productId }),
    ...(props.body.customerId !== null && {
      customer_id: props.body.customerId,
    }),
    ...(props.body.minRating !== null && {
      rating: { gte: props.body.minRating },
    }),
    ...(props.body.maxRating !== null && {
      rating: { lte: props.body.maxRating },
    }),
    ...(props.body.createdAfter !== null && {
      created_at: { gt: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore !== null && {
      created_at: { lt: new Date(props.body.createdBefore) },
    }),
    ...(props.body.search !== null && {
      content: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const orderBy = (
    props.body.sort === "oldest"
      ? { created_at: "asc" as const }
      : props.body.sort === "highestRating"
        ? { rating: "desc" as const }
        : props.body.sort === "lowestRating"
          ? { rating: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.ecommerce_mall_reviews.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
