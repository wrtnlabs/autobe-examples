import { ICommunityPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostStatus";
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

export async function postCommunityModeratorPostsPostIdStatus(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPostStatus;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: { community_post_status_id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);
  const status = await MyGlobal.prisma.community_post_statuses.findUnique({
    where: { id: post.community_post_status_id },
  });
  if (!status) throw new HttpException("Post status not found", 404);
  const allowedStatuses = ["approved", "flagged", "deleted", "archived"];
  if (!allowedStatuses.includes(props.body as string))
    throw new HttpException("Invalid status", 400);
  if (status.status === props.body)
    throw new HttpException("Post already in target status", 400);
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  await MyGlobal.prisma.community_post_statuses.update({
    where: { id: post.community_post_status_id },
    data: {
      status: props.body,
      action_timestamp: now,
      moderator_id: props.moderator.id,
    },
  });
  await MyGlobal.prisma.community_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      moderator_id: props.moderator.id,
      action_type: "UPDATE_POST_STATUS",
      target_id: props.postId,
      target_type: "POST",
      description: JSON.stringify({
        old_status: status.status,
        new_status: props.body,
      }),
      created_at: now,
    },
  });
  return;
}
