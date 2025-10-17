import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function putRedditCommunityCommunityModeratorReportsReportId(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReport.IUpdate;
}): Promise<IRedditCommunityReport> {
  const { communityModerator, reportId, body } = props;

  const existingReport =
    await MyGlobal.prisma.reddit_community_reports.findUnique({
      where: { id: reportId },
    });

  if (existingReport === null) {
    throw new HttpException("Report not found", 404);
  }

  const updatedReport = await MyGlobal.prisma.reddit_community_reports.update({
    where: { id: reportId },
    data: {
      status_id: body.status_id,
      category: body.category,
      description: body.description === undefined ? null : body.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updatedReport.id,
    reporter_guest_id:
      updatedReport.reporter_guest_id === null
        ? null
        : (updatedReport.reporter_guest_id ?? undefined),
    reporter_member_id:
      updatedReport.reporter_member_id === null
        ? null
        : (updatedReport.reporter_member_id ?? undefined),
    reported_post_id:
      updatedReport.reported_post_id === null
        ? null
        : (updatedReport.reported_post_id ?? undefined),
    reported_comment_id:
      updatedReport.reported_comment_id === null
        ? null
        : (updatedReport.reported_comment_id ?? undefined),
    reported_member_id:
      updatedReport.reported_member_id === null
        ? null
        : (updatedReport.reported_member_id ?? undefined),
    status_id: updatedReport.status_id,
    category: updatedReport.category,
    description:
      updatedReport.description === null
        ? null
        : (updatedReport.description ?? undefined),
    created_at: toISOStringSafe(updatedReport.created_at),
    updated_at: toISOStringSafe(updatedReport.updated_at),
    deleted_at: updatedReport.deleted_at
      ? toISOStringSafe(updatedReport.deleted_at)
      : null,
  };
}
