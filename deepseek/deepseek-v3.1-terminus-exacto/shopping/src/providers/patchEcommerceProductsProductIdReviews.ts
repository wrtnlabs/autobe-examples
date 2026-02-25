import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
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
import { EcommerceReviewAtSummaryTransformer } from "../transformers/EcommerceReviewAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductIdReviews(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceReview.IRequest;
}): Promise<IPageIEcommerceReview.ISummary> {
  // Validate product exists
  await MyGlobal.prisma.ecommerce_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Build where clause
  const whereInput = {
    product: { id: props.productId },
    is_deleted: false,
    ...(props.body.ratings &&
      props.body.ratings.length > 0 && { rating: { in: props.body.ratings } }),
    ...(props.body.search && { content: { contains: props.body.search } }),
    ...(props.body.start_date && {
      created_at: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date && {
      created_at: { lte: new Date(props.body.end_date) },
    }),
    ...(props.body.updated_start && {
      updated_at: { gte: new Date(props.body.updated_start) },
    }),
    ...(props.body.updated_end && {
      updated_at: { lte: new Date(props.body.updated_end) },
    }),
  } satisfies Prisma.ecommerce_reviewsWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Determine sort order with fallback
  const orderByInput = (
    props.body.sort_by === "created_at"
      ? { created_at: (props.body.sort_order ?? "desc") as "asc" | "desc" }
      : props.body.sort_by === "updated_at"
        ? { updated_at: (props.body.sort_order ?? "desc") as "asc" | "desc" }
        : props.body.sort_by === "rating"
          ? { rating: (props.body.sort_order ?? "desc") as "asc" | "desc" }
          : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_reviewsOrderByWithRelationInput;
  // Execute queries sequentially
  const data = await MyGlobal.prisma.ecommerce_reviews.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceReviewAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_reviews.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceReviewAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceReview.ISummary;
}
