import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityReport";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function putCommunityForumModeratorReportsReportId(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityForumCommunityReport.IUpdate;
}): Promise<ICommunityForumCommunityReport> {
  // First, check if the report exists
  const existingReport =
    await MyGlobal.prisma.community_forum_reports.findUnique({
      where: { id: props.reportId },
    });

  if (!existingReport) {
    throw new HttpException("Report not found", 404);
  }

  // Update the report with all fields in a single operation
  const updatedReport = await MyGlobal.prisma.community_forum_reports.update({
    where: { id: props.reportId },
    data: {
      ...(props.body.actor_type !== undefined && {
        actor_type: props.body.actor_type,
      }),
      ...(props.body.reason !== undefined && { reason: props.body.reason }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      updated_at: new Date(),
      community_forum_moderator_id: props.moderator.id,
    },
  });

  // Return the updated report with proper type conversion
  return {
    id: updatedReport.id,
    community_forum_user_id: updatedReport.community_forum_user_id,
    community_forum_moderator_id:
      updatedReport.community_forum_moderator_id ?? undefined,
    actor_type: updatedReport.actor_type,
    reason: updatedReport.reason,
    description: updatedReport.description,
    status: updatedReport.status,
    created_at: toISOStringSafe(updatedReport.created_at),
    updated_at: toISOStringSafe(updatedReport.updated_at),
    deleted_at: updatedReport.deleted_at
      ? toISOStringSafe(updatedReport.deleted_at)
      : undefined,
  };
}
