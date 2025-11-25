import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorPostsPostIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_community_community_id: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  const comment = await MyGlobal.prisma.reddit_community_comments.findFirst({
    where: {
      id: props.commentId,
      reddit_community_post_id: props.postId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  const moderatorAuthority =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: post.reddit_community_community_id,
      },
    });

  if (!moderatorAuthority) {
    throw new HttpException(
      "You do not have moderation authority over this community",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_comments.delete({
    where: {
      id: props.commentId,
    },
  });
}
