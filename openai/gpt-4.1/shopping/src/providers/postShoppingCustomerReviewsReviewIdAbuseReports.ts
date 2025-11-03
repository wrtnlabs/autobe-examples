import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingCustomerReviewsReviewIdAbuseReports(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  body: IShoppingReviewAbuseReport.ICreate;
}): Promise<IShoppingReviewAbuseReport> {
  const { customer, reviewId, body } = props;

  // 1. Check the review exists and is not soft-deleted
  const review = await MyGlobal.prisma.shopping_reviews.findFirst({
    where: { id: reviewId, deleted_at: null },
    select: { id: true },
  });
  if (!review) {
    throw new HttpException("Review not found", 404);
  }

  // 2. Enforce: Only one report per (customer, review)
  const duplicate =
    await MyGlobal.prisma.shopping_review_abuse_reports.findFirst({
      where: {
        shopping_review_id: reviewId,
        reporter_customer_id: customer.id,
      },
      select: { id: true },
    });
  if (duplicate) {
    throw new HttpException("You have already reported this review.", 409);
  }

  // 3. Insert new abuse report
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_review_abuse_reports.create({
    data: {
      id: v4(),
      shopping_review_id: reviewId,
      reporter_customer_id: customer.id,
      report_type: body.report_type,
      comment: body.comment ?? undefined,
      state: "open",
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // 4. Return API DTO
  return {
    id: created.id,
    shopping_review_id: created.shopping_review_id,
    reporter_customer_id: created.reporter_customer_id,
    report_type: created.report_type,
    comment: created.comment ?? undefined,
    state: created.state,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
