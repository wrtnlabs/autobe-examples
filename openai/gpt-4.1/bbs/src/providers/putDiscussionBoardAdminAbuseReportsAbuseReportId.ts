import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAbuseReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminAbuseReportsAbuseReportId(props: {
  admin: AdminPayload;
  abuseReportId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAbuseReport.IUpdate;
}): Promise<IDiscussionBoardAbuseReport> {
  const { abuseReportId, body } = props;

  // Ensure at least one updatable field is present
  if (
    body.abuse_category === undefined &&
    body.reason === undefined &&
    body.status === undefined
  ) {
    throw new HttpException(
      "At least one of abuse_category, reason, or status must be specified for update.",
      400,
    );
  }

  // Compose update fields with current timestamp for updated_at
  const updateData = {
    ...(body.abuse_category !== undefined && {
      abuse_category: body.abuse_category,
    }),
    ...(body.reason !== undefined && { reason: body.reason }),
    ...(body.status !== undefined && { status: body.status }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Update the abuse report, throw 404 if not found
  const updated = await MyGlobal.prisma.discussion_board_abuse_reports.update({
    where: { id: abuseReportId },
    data: updateData,
  });

  return {
    id: updated.id,
    reporter_user_id: updated.reporter_user_id,
    target_article_id:
      updated.target_article_id === null
        ? undefined
        : updated.target_article_id,
    target_comment_id:
      updated.target_comment_id === null
        ? undefined
        : updated.target_comment_id,
    abuse_category: updated.abuse_category,
    reason: updated.reason,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
