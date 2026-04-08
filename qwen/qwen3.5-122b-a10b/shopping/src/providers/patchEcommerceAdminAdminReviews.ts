import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReview";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceReviewAtSummaryTransformer } from "../transformers/EcommerceReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminAdminReviews(props: {
  admin: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  body: IEcommerceReview.IRequest;
}): Promise<IPageIEcommerceReview.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where: Prisma.ecommerce_reviewsWhereInput = {
    ...(props.body.product_id !== undefined && {
      product_id: props.body.product_id,
    }),
    ...(props.body.customer_id !== undefined && {
      customer_id: props.body.customer_id,
    }),
    ...(props.body.ratingMin !== undefined || props.body.ratingMax !== undefined
      ? {
          rating: {
            ...(props.body.ratingMin !== undefined && {
              gte: props.body.ratingMin,
            }),
            ...(props.body.ratingMax !== undefined && {
              lte: props.body.ratingMax,
            }),
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(props.body.includeDeleted !== true && {
      deleted_at: null,
    }),
  } satisfies Prisma.ecommerce_reviewsWhereInput;
  const orderBy: Prisma.ecommerce_reviewsOrderByWithRelationInput = {
    created_at: "desc",
  } satisfies Prisma.ecommerce_reviewsOrderByWithRelationInput;
  const [records, total]: [
    Prisma.ecommerce_reviewsGetPayload<
      ReturnType<typeof EcommerceReviewAtSummaryTransformer.select>
    >[],
    number,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_reviews.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...EcommerceReviewAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_reviews.count({ where }),
  ]);
  const pages: number = Math.ceil(total / limit);
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: pages,
  } satisfies IPage.IPagination;
  const data: IEcommerceReview.ISummary[] = await ArrayUtil.asyncMap(
    records,
    EcommerceReviewAtSummaryTransformer.transform,
  );
  const result: IPageIEcommerceReview.ISummary = {
    pagination: pagination,
    data: data,
  } satisfies IPageIEcommerceReview.ISummary;
  return result;
}
