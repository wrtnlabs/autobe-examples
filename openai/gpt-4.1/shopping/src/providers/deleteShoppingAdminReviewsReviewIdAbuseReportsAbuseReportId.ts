import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminReviewsReviewIdAbuseReportsAbuseReportId(props: {
  admin: AdminPayload;
  reviewId: string & tags.Format<"uuid">;
  abuseReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the target abuse report and validate ownership by reviewId
  const abuseReport =
    await MyGlobal.prisma.shopping_review_abuse_reports.findFirst({
      where: {
        id: props.abuseReportId,
        shopping_review_id: props.reviewId,
        deleted_at: null,
      },
    });
  if (!abuseReport) {
    throw new HttpException("Abuse report not found for specified review", 404);
  }

  // 2. Hard delete the report
  await MyGlobal.prisma.shopping_review_abuse_reports.delete({
    where: {
      id: props.abuseReportId,
    },
  });

  // 3. Log the action in admin audit logs
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: props.admin.id,
      category: "review_abuse_report",
      event_type: "ABUSE_REPORT_HARD_DELETE",
      ip: null,
      description: `Admin deleted abuse report ${props.abuseReportId} for review ${props.reviewId}`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  return;
}
