import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function deleteRedditCommunityCommunityModeratorPostsPostId(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_registered_user_id: true,
      reddit_community_id: true,
    },
  });

  if (post === null) {
    throw new HttpException("Post not found", 404);
  }

  const isAuthor =
    post.reddit_registered_user_id === props.communityModerator.id;

  if (!isAuthor) {
    const moderatorRecord =
      await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
        where: {
          id: props.communityModerator.id,
          deleted_at: null,
        },
      });

    if (moderatorRecord === null) {
      throw new HttpException("Forbidden", 403);
    }
  }

  await MyGlobal.prisma.reddit_community_posts.delete({
    where: { id: props.postId },
  });
}
