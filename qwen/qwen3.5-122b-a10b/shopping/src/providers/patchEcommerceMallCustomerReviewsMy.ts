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

export async function patchEcommerceMallCustomerReviewsMy(props: {
  customer: CustomerPayload;
  body: IEcommerceMallReview.IRequest;
}): Promise<IPageIEcommerceMallReview.ISummary> {
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  // Sorting parameters with defaults
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Build where clause - filter by customer_id (authenticated customer)
  const whereInput: Prisma.ecommerce_mall_reviewsWhereInput = {
    customer_id: props.customer.id,
    ...(props.body.productId !== undefined && {
      product_id: props.body.productId,
    }),
    ...(props.body.rating !== undefined && {
      rating: props.body.rating,
    }),
    ...(props.body.isDeleted !== undefined && {
      is_deleted: props.body.isDeleted,
    }),
    ...(props.body.startDate !== undefined || props.body.endDate !== undefined
      ? {
          created_at: {
            ...(props.body.startDate !== undefined && {
              gte: new Date(props.body.startDate),
            }),
            ...(props.body.endDate !== undefined && {
              lte: new Date(props.body.endDate),
            }),
          },
        }
      : {}),
  };
  // Build orderBy
  const orderByInput: Prisma.ecommerce_mall_reviewsOrderByWithRelationInput =
    sortBy === "rating" ? { rating: sortOrder } : { created_at: sortOrder };
  // Query for data
  const data = await MyGlobal.prisma.ecommerce_mall_reviews.findMany({
    where: whereInput,
    skip,
    take: pageSize,
    orderBy: orderByInput,
    ...EcommerceMallReviewAtSummaryTransformer.select(),
  });
  // Query for total count
  const total = await MyGlobal.prisma.ecommerce_mall_reviews.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallReviewAtSummaryTransformer.transform,
  );
  // Calculate pagination
  const limit = Math.min(pageSize, 100);
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallReview.ISummary;
}
