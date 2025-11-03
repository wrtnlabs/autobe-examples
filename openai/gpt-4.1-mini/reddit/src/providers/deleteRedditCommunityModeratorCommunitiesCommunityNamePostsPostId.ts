import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorCommunitiesCommunityNamePostsPostId(props: {
  moderator: ModeratorPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderator, communityName, postId } = props;

  // Step 1: Find community by name
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: communityName },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Step 2: Authorization check - verify moderator is assigned to the community
  const modAssignment =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        reddit_community_community_id: community.id,
        reddit_community_moderator_id: moderator.id,
      },
    });
  if (!modAssignment) {
    throw new HttpException(
      "Unauthorized: Moderator not assigned to this community",
      403,
    );
  }

  // Step 3: Find the post in the community
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: postId },
    select: { reddit_community_community_id: true },
  });
  if (!post || post.reddit_community_community_id !== community.id) {
    throw new HttpException("Post not found in the specified community", 404);
  }

  // Step 4: Perform soft delete by setting deleted_at
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_community_posts.update({
    where: { id: postId },
    data: { deleted_at: deletedAt },
  });
}
