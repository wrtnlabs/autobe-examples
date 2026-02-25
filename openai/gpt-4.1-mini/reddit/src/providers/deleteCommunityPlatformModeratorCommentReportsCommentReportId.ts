import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformModeratorCommentReportsCommentReportId(props: {
  moderator: ModeratorPayload;
  commentReportId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existingReport =
    await MyGlobal.prisma.community_platform_comment_reports.findUnique({
      where: { id: props.commentReportId },
    });
  if (!existingReport) {
    throw new HttpException("Comment report not found", 404);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_comment_reports.delete({
      where: { id: props.commentReportId },
    });
    const logId = v4() as string & tags.Format<"uuid">;
    const createdAt = new Date().toISOString() as string &
      tags.Format<"date-time">;
    await tx.community_platform_moderation_logs.create({
      data: {
        id: logId,
        moderator_id: props.moderator.id,
        target_type: "comment_report",
        target_id: props.commentReportId,
        action_type: "delete",
        detail: "Deleted comment report",
        created_at: createdAt,
      },
    });
  });
}
