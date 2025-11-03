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

export async function putShoppingCustomerReviewsReviewIdAbuseReportsAbuseReportId(props: {
  customer: CustomerPayload;
  reviewId: string & tags.Format<"uuid">;
  abuseReportId: string & tags.Format<"uuid">;
  body: IShoppingReviewAbuseReport.IUpdate;
}): Promise<IShoppingReviewAbuseReport> {
  // 1. Fetch the abuse report with matching IDs and customer, not deleted
  const report = await MyGlobal.prisma.shopping_review_abuse_reports.findFirst({
    where: {
      id: props.abuseReportId,
      shopping_review_id: props.reviewId,
      reporter_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!report) {
    throw new HttpException("Abuse report not found or not accessible", 404);
  }
  // 2. Only editable if state is 'open'
  if (report.state !== "open") {
    throw new HttpException(
      "Abuse report is not editable in its current state",
      403,
    );
  }
  // 3. Prepare update fields
  const update: {
    report_type?: string;
    comment?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.report_type !== undefined) {
    update.report_type = props.body.report_type;
  }
  if (props.body.comment !== undefined) {
    update.comment = props.body.comment;
  }
  // 4. Apply update with Prisma
  const updated = await MyGlobal.prisma.shopping_review_abuse_reports.update({
    where: { id: props.abuseReportId },
    data: update,
  });
  // 5. Return result object formatted per DTO
  return {
    id: updated.id,
    shopping_review_id: updated.shopping_review_id,
    reporter_customer_id: updated.reporter_customer_id,
    report_type: updated.report_type,
    comment:
      updated.comment === null || updated.comment === undefined
        ? undefined
        : updated.comment,
    state: updated.state,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
