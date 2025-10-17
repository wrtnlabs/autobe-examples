import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function deleteRedditCommunityCommunityModeratorCommunitiesCommunityIdPostsPostId(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { communityModerator, communityId, postId } = props;

  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: postId,
      reddit_community_community_id: communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      author_member_id: true,
      reddit_community_community_id: true,
    },
  });

  if (post === null) {
    throw new HttpException("Post not found", 404);
  }

  const isModerator =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: communityModerator.id,
        community_id: communityId,
      },
      select: {
        id: true,
      },
    });

  if (isModerator === null) {
    throw new HttpException(
      "Unauthorized: Not a community moderator of the community",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_posts.delete({
    where: {
      id: postId,
    },
  });

  return;
}
