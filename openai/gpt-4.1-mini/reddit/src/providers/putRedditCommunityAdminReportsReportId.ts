import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IUpdate;
}): Promise<IRedditCommunityReport> {
  const { admin, reportId, body } = props;

  const report = await MyGlobal.prisma.reddit_community_reports
    .findUniqueOrThrow({
      where: { id: reportId },
    })
    .catch(() => {
      throw new HttpException("Report not found", 404);
    });

  const updated = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: reportId },
    data: {
      reporter_guest_id: body.reporter_guest_id ?? undefined,
      reporter_member_id: body.reporter_member_id ?? undefined,
      reported_post_id: body.reported_post_id ?? undefined,
      reported_comment_id: body.reported_comment_id ?? undefined,
      reported_member_id: body.reported_member_id ?? undefined,
      status_id: body.status_id,
      category: body.category,
      description: body.description ?? undefined,
    } satisfies IRedditCommunityReport.IUpdate,
  });

  return {
    id: updated.id,
    reporter_guest_id: updated.reporter_guest_id ?? null,
    reporter_member_id: updated.reporter_member_id ?? null,
    reported_post_id: updated.reported_post_id ?? null,
    reported_comment_id: updated.reported_comment_id ?? null,
    reported_member_id: updated.reported_member_id ?? null,
    status_id: updated.status_id,
    category: updated.category,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
