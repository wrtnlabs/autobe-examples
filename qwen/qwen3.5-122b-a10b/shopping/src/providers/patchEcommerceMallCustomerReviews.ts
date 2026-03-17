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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallReviewAtSummaryTransformer } from "../transformers/EcommerceMallReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    ...(props.body.productId && {
      product_id: props.body.productId,
    }),
    ...(props.body.customerId && {
      customer_id: props.body.customerId,
    }),
    ...(props.body.rating && {
      rating: props.body.rating,
    }),
    ...(props.body.isDeleted !== undefined && {
      is_deleted: props.body.isDeleted,
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput =
    props.body.sortBy === "rating"
      ? { rating: props.body.sortOrder ?? "desc" }
      : { created_at: props.body.sortOrder ?? "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_reviews.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: pageSize,
      ...EcommerceMallReviewAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_reviews.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / pageSize);
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallReviewAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallReview.ISummary;
}
