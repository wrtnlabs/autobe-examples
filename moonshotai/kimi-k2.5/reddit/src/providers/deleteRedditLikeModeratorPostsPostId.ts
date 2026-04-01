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

export async function deleteRedditLikeModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch post to verify existence and get community/author info
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      community_id: true,
    },
  });
  // Verify moderator has authority in this community
  const moderatorRole = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      id: props.moderator.id,
      community_id: post.community_id,
      deleted_at: null,
    },
  });
  if (moderatorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Execute hard delete of the post (cascade handles votes, snapshots, content)
  await MyGlobal.prisma.reddit_like_posts.delete({
    where: { id: props.postId },
  });
}
