import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingReviewAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingReviewAbuseReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminReviewsReviewIdAbuseReportsAbuseReportId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  abuseReportId: string & tags.Format<"uuid">;
}): Promise<IShoppingReviewAbuseReport> {
  const report = await MyGlobal.prisma.shopping_review_abuse_reports.findFirst({
    where: {
      id: props.abuseReportId,
      shopping_review_id: props.reviewId,
      deleted_at: null,
    },
  });
  if (!report) {
    throw new HttpException("Abuse report not found", 404);
  }
  return {
    id: report.id,
    shopping_review_id: report.shopping_review_id,
    reporter_customer_id: report.reporter_customer_id,
    report_type: report.report_type,
    comment: report.comment !== null ? report.comment : undefined,
    state: report.state,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
  };
}
