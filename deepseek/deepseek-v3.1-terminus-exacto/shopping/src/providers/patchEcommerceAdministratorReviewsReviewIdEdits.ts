import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEcommerceReviewEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewEdit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceReviewEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewEdit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceReviewEditAtSummaryTransformer } from "../transformers/EcommerceReviewEditAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorReviewsReviewIdEdits(props: {
  administrator: AdministratorPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IEcommerceReviewEdit.IRequest;
}): Promise<IPageIEcommerceReviewEdit.ISummary> {
  // Verify review exists (administrators can access all reviews)
  await MyGlobal.prisma.ecommerce_reviews.findUniqueOrThrow({
    where: { id: props.reviewId },
  });
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereConditions: Prisma.ecommerce_review_editsWhereInput = {
    ecommerce_review_id: props.reviewId,
  };
  // Handle date range filters
  if (props.body.edited_at_start || props.body.edited_at_end) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.edited_at_start) {
      dateFilter.gte = new Date(props.body.edited_at_start);
    }
    if (props.body.edited_at_end) {
      dateFilter.lte = new Date(props.body.edited_at_end);
    }
    whereConditions.edited_at = dateFilter;
  }
  // Handle rating filters
  if (
    props.body.rating_before !== undefined &&
    props.body.rating_before !== null
  ) {
    whereConditions.rating_before = props.body.rating_before;
  }
  if (
    props.body.rating_after !== undefined &&
    props.body.rating_after !== null
  ) {
    whereConditions.rating_after = props.body.rating_after;
  }
  // Handle content search
  if (
    props.body.content_contains !== undefined &&
    props.body.content_contains !== null
  ) {
    whereConditions.OR = [
      {
        content_before: {
          contains: props.body.content_contains,
          mode: "insensitive",
        },
      },
      {
        content_after: {
          contains: props.body.content_contains,
          mode: "insensitive",
        },
      },
    ];
  }
  // Get paginated data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_review_edits.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { edited_at: "desc" },
      ...EcommerceReviewEditAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_review_edits.count({
      where: whereConditions,
    }),
  ]);
  const pages = Math.ceil(total / limit) || 1;
  const current = page > pages ? pages : page;
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceReviewEditAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
