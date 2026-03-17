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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewAtSummaryTransformer } from "../transformers/EcommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerReviewsSearch(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    deleted_at: null,
    ...(props.body.customer_id !== undefined && {
      customer_id: props.body.customer_id,
    }),
    ...(props.body.product_id !== undefined && {
      product_id: props.body.product_id,
    }),
    ...(props.body.order_id !== undefined && { order_id: props.body.order_id }),
    ...(props.body.min_rating !== undefined && {
      rating: { gte: props.body.min_rating },
    }),
    ...(props.body.max_rating !== undefined && {
      rating: { lte: props.body.max_rating },
    }),
    ...(props.body.is_verified_purchase !== undefined && {
      is_verified_purchase: props.body.is_verified_purchase,
    }),
    ...(props.body.from_created_at !== undefined && {
      created_at: { gte: new Date(props.body.from_created_at) },
    }),
    ...(props.body.to_created_at !== undefined && {
      created_at: { lte: new Date(props.body.to_created_at) },
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length >= 2 && {
        body: { contains: props.body.search },
      }),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const direction: "asc" | "desc" = props.body.direction ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput = (
    props.body.sort_by === "rating"
      ? { rating: direction }
      : { created_at: direction }
  ) satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
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
