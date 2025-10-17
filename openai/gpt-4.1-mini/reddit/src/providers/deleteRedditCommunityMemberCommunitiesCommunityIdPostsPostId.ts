import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteRedditCommunityMemberCommunitiesCommunityIdPostsPostId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, communityId, postId } = props;

  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      reddit_community_community_id: true,
      author_member_id: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.reddit_community_community_id !== communityId) {
    throw new HttpException(
      "Post does not belong to the specified community",
      404,
    );
  }

  if (post.author_member_id === member.id) {
    // authorized
  } else {
    const moderator =
      await MyGlobal.prisma.reddit_community_community_moderators.findUnique({
        where: {
          member_id_community_id: {
            member_id: member.id,
            community_id: communityId,
          },
        },
        select: { id: true },
      });

    if (!moderator) {
      throw new HttpException("Unauthorized to delete post", 403);
    }
  }

  await MyGlobal.prisma.reddit_community_posts.delete({
    where: { id: postId },
  });
}
