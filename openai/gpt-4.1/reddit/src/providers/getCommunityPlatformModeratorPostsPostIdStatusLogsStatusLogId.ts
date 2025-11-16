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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorPostsPostIdStatusLogsStatusLogId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  statusLogId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostStatusLog> {
  const statusLog =
    await MyGlobal.prisma.community_platform_post_status_logs.findFirst({
      where: {
        id: props.statusLogId,
        post_id: props.postId,
      },
      include: {
        post: {
          include: {
            community: true,
            user: true,
          },
        },
        user: true,
        userSession: true,
      },
    });

  if (!statusLog) {
    throw new HttpException(
      "Status log entry not found for the specified post and status log id.",
      404,
    );
  }

  return {
    id: statusLog.id,
    post: {
      id: statusLog.post.id,
      community_id: statusLog.post.community_id,
      community: statusLog.post.community
        ? {
            id: statusLog.post.community.id,
            name: statusLog.post.community.name,
            display_title: statusLog.post.community.display_title,
            description: statusLog.post.community.description,
            visibility: statusLog.post.community.visibility,
            image_url: statusLog.post.community.image_url ?? undefined,
            status: statusLog.post.community.status,
          }
        : undefined,
      user_id: statusLog.post.user_id,
      user: statusLog.post.user
        ? {
            id: statusLog.post.user.id,
          }
        : undefined,
    },
    user: {
      id: statusLog.user.id,
    },
    userSession: {
      id: statusLog.userSession.id,
      created_at: toISOStringSafe(statusLog.userSession.created_at),
    },
    old_status:
      typeof statusLog.old_status === "undefined"
        ? undefined
        : statusLog.old_status,
    new_status: statusLog.new_status,
    reason:
      typeof statusLog.reason === "undefined" ? undefined : statusLog.reason,
    created_at: toISOStringSafe(statusLog.created_at),
  };
}
