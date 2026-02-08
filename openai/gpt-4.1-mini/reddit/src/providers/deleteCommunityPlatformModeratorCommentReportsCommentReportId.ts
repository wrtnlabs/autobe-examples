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
  const report =
    await MyGlobal.prisma.community_platform_comment_reports.findUnique({
      where: { id: props.commentReportId },
    });
  if (!report) {
    throw new HttpException("Comment report not found", 404);
  }
  await MyGlobal.prisma.community_platform_comment_reports.delete({
    where: { id: props.commentReportId },
  });
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      moderator_id: props.moderator.id,
      action_type: "delete_comment_report",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
