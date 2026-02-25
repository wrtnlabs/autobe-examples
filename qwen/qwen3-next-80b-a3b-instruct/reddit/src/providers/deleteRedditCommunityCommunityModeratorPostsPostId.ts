import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityCommunityModeratorPostsPostId(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string;
}): Promise<void> {
  // Find and verify post exists (automatic 404 on failure)
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { community_id: true },
  });
  // Verify moderator has authority over the community where the post belongs
  const moderator = await MyGlobal.prisma.reddit_community_moderators.findFirst(
    {
      where: {
        community_id: post.community_id,
        user_id: props.communityModerator.id,
      },
    },
  );
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the post - cascade handles automatic deletion of associated comments
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: props.postId },
    data: { is_deleted: true },
  });
}
