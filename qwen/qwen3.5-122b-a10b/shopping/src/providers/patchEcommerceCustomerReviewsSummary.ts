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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceReviewAtSummaryTransformer } from "../transformers/EcommerceReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerReviewsSummary(props: {
  customer: CustomerPayload;
  body: IEcommerceReview.IRequest;
}): Promise<IPageIEcommerceReview.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = Math.min(props.body.limit ?? 20, 100);
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_reviewsWhereInput = {
    customer_id: props.customer.id,
    ...(props.body.includeDeleted !== true && {
      deleted_at: null,
    }),
    ...(props.body.product_id && {
      product_id: props.body.product_id,
    }),
    ...(props.body.ratingMin !== undefined &&
      props.body.ratingMax !== undefined && {
        rating: {
          gte: props.body.ratingMin,
          lte: props.body.ratingMax,
        },
      }),
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: props.body.createdAtFrom,
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: props.body.createdAtTo,
      },
    }),
  } satisfies Prisma.ecommerce_reviewsWhereInput;
  const sort: string = props.body.sort ?? "created_at DESC";
  const orderByInput: Prisma.ecommerce_reviewsOrderByWithRelationInput =
    sort === "created_at ASC"
      ? { created_at: "asc" as const }
      : sort === "rating DESC"
        ? { rating: "desc" as const }
        : sort === "rating ASC"
          ? { rating: "asc" as const }
          : sort === "updated_at DESC"
            ? { updated_at: "desc" as const }
            : { created_at: "desc" as const };
  const records = await MyGlobal.prisma.ecommerce_reviews.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceReviewAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.ecommerce_reviews.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceReviewAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceReview.ISummary;
}
