import { ICommunityPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostIdStatus(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<{
  status: string;
  action_comment: string | null;
}> {
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: { community_post_status_id: true },
  });
  if (!post) throw new HttpException("Post not found", 404);
  const statusRecord = await MyGlobal.prisma.community_post_statuses.findUnique(
    {
      where: { id: post.community_post_status_id },
      select: { status: true, action_comment: true },
    },
  );
  if (!statusRecord) throw new HttpException("Post status not found", 404);
  if (statusRecord.status === "deleted")
    throw new HttpException("Post deleted", 404);
  return {
    status: statusRecord.status,
    action_comment: statusRecord.action_comment,
  };
}
