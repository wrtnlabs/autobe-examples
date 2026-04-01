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

export async function patchEcommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    deleted_at: null,
    ...(props.body.customer_id && {
      customer_id: props.body.customer_id,
    }),
    ...(props.body.product_id && {
      product_id: props.body.product_id,
    }),
    ...(props.body.order_id && {
      order_id: props.body.order_id,
    }),
    ...(props.body.min_rating !== undefined && {
      rating: {
        gte: props.body.min_rating,
      },
    }),
    ...(props.body.max_rating !== undefined && {
      rating: {
        lte: props.body.max_rating,
      },
    }),
    ...(props.body.search !== undefined && {
      OR: [
        { title: { contains: props.body.search } },
        { body: { contains: props.body.search } },
      ],
    }),
    ...(props.body.is_verified_purchase !== undefined && {
      is_verified_purchase: props.body.is_verified_purchase,
    }),
    ...(props.body.from_created_at !== undefined && {
      created_at: {
        gte: new Date(props.body.from_created_at),
      },
    }),
    ...(props.body.to_created_at !== undefined && {
      created_at: {
        lte: new Date(props.body.to_created_at),
      },
    }),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput[] =
    [
      props.body.sort_by === "rating"
        ? { rating: props.body.direction ?? "desc" }
        : { created_at: (props.body.direction ?? "desc") as "asc" | "desc" },
    ];
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_reviews.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallReviewAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallReviewAtSummaryTransformer.transform,
    ),
  };
}
