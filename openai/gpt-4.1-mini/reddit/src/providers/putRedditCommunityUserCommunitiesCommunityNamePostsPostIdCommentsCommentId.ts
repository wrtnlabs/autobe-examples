import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putRedditCommunityUserCommunitiesCommunityNamePostsPostIdCommentsCommentId(props: {
  user: UserPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  const { user, communityName, postId, commentId, body } = props;

  const comment = await MyGlobal.prisma.reddit_community_comments.findFirst({
    where: {
      id: commentId,
      reddit_community_post_id: postId,
      post: {
        community: {
          name: communityName,
          deleted_at: null,
        },
      },
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.reddit_community_user_id !== user.id) {
    throw new HttpException(
      "Forbidden: You can only update your own comments",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: commentId },
    data: {
      body: body.body,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    reddit_community_post_id: updated.reddit_community_post_id,
    parent_id: updated.parent_id ?? undefined,
    reddit_community_user_id: updated.reddit_community_user_id,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
