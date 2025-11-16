import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostStatusLog";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorPostsPostIdStatusLogsStatusLogId(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  statusLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostStatusLog> {
  const statusLog =
    await MyGlobal.prisma.community_platform_post_status_logs.findUnique({
      where: { id: props.statusLogId },
      include: {
        post: true,
        user: true,
        userSession: true,
      },
    });

  if (!statusLog || statusLog.post_id !== props.postId) {
    throw new HttpException("Status log not found for the specified post", 404);
  }

  return {
    id: statusLog.id,
    post: {
      id: statusLog.post.id,
      community_id: statusLog.post.community_id,
      community: undefined,
      user_id: statusLog.post.user_id,
      user: undefined,
    },
    user: {
      id: statusLog.user.id,
    },
    userSession: {
      id: statusLog.userSession.id,
      created_at: toISOStringSafe(statusLog.userSession.created_at),
    },
    old_status:
      typeof statusLog.old_status === "string"
        ? statusLog.old_status
        : undefined,
    new_status: statusLog.new_status,
    reason: typeof statusLog.reason === "string" ? statusLog.reason : undefined,
    created_at: toISOStringSafe(statusLog.created_at),
  };
}
