import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminCommunitiesCommunityIdPostsPostId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, communityId, postId } = props;

  // Verify that the post exists and belongs to the specified community
  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: postId,
      reddit_community_community_id: communityId,
      deleted_at: null,
    },
  });

  if (post === null) {
    throw new HttpException("Post not found", 404);
  }

  // Delete the post with cascade on related comments and votes
  // since database schema is set with onDelete: Cascade
  await MyGlobal.prisma.reddit_community_posts.delete({
    where: { id: postId },
  });
}
