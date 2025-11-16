import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentStatusLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorCommentsCommentIdStatusLogsStatusLogId(props: {
  administrator: AdministratorPayload;
  commentId: string & tags.Format<"uuid">;
  statusLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentStatusLog> {
  const statusLog =
    await MyGlobal.prisma.community_platform_comment_status_logs.findUnique({
      where: { id: props.statusLogId },
    });

  if (!statusLog || statusLog.comment_id !== props.commentId) {
    throw new HttpException(
      "Status log not found for the specified comment.",
      404,
    );
  }

  return {
    id: statusLog.id,
    comment_id: statusLog.comment_id,
    user_session_id: statusLog.user_session_id,
    status: statusLog.status,
    reason:
      typeof statusLog.reason === "undefined" ? undefined : statusLog.reason,
    created_at: toISOStringSafe(statusLog.created_at),
  };
}
