import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallReviews(props: {
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const ratingFilter: Prisma.IntFilter<"ecommerce_mall_reviews"> | undefined =
    (props.body.minRating !== undefined && props.body.minRating !== null) ||
    (props.body.maxRating !== undefined && props.body.maxRating !== null)
      ? {
          ...(props.body.minRating !== undefined &&
            props.body.minRating !== null && { gte: props.body.minRating }),
          ...(props.body.maxRating !== undefined &&
            props.body.maxRating !== null && { lte: props.body.maxRating }),
        }
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(props.body.customerId !== undefined &&
      props.body.customerId !== null && { customer_id: props.body.customerId }),
    ...(props.body.productId !== undefined &&
      props.body.productId !== null && { product_id: props.body.productId }),
    ...(props.body.orderId !== undefined &&
      props.body.orderId !== null && { order_id: props.body.orderId }),
    ...(ratingFilter !== undefined && { rating: ratingFilter }),
  } satisfies Prisma.ecommerce_mall_reviewsWhereInput;
  const orderByInput = (
    props.body.sortBy === "rating" && props.body.sortOrder === "asc"
      ? { rating: "asc" as const }
      : props.body.sortBy === "rating" && props.body.sortOrder === "desc"
        ? { rating: "desc" as const }
        : props.body.sortOrder === "asc"
          ? { created_at: "asc" as const }
          : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_reviewsOrderByWithRelationInput;
  const [reviews, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_reviews.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        product_id: true,
        order_id: true,
        rating: true,
        content: true,
        created_at: true,
        deleted_at: true,
        customer: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.count({
      where: whereInput,
    }),
  ]);
  const data = reviews.map(
    (review) =>
      ({
        id: review.id,
        customer: {
          id: review.customer.id,
          email: review.customer.email,
          createdAt: review.customer.created_at.toISOString(),
          updatedAt: review.customer.updated_at.toISOString(),
          deletedAt: review.customer.deleted_at?.toISOString() ?? null,
        } satisfies IEcommerceMallCustomer.ISummary,
        productId: review.product_id,
        orderId: review.order_id,
        rating: review.rating,
        content: review.content,
        createdAt: review.created_at.toISOString(),
        deletedAt: review.deleted_at?.toISOString() ?? null,
      }) satisfies IEcommerceMallReview.ISummary,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
