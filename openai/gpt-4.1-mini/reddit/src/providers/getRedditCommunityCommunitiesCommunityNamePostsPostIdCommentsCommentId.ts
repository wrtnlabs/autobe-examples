import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";

export async function getRedditCommunityCommunitiesCommunityNamePostsPostIdCommentsCommentId(props: {
  communityName: string;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityComment> {
  const { communityName, postId, commentId } = props;

  try {
    const comment =
      await MyGlobal.prisma.reddit_community_comments.findFirstOrThrow({
        where: {
          id: commentId,
          reddit_community_post_id: postId,
          post: {
            community: {
              name: communityName,
            },
          },
          deleted_at: null,
        },
        select: {
          id: true,
          reddit_community_post_id: true,
          parent_id: true,
          reddit_community_user_id: true,
          body: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });

    return {
      id: comment.id,
      reddit_community_post_id: comment.reddit_community_post_id,
      parent_id:
        comment.parent_id === null ? null : (comment.parent_id ?? undefined),
      reddit_community_user_id: comment.reddit_community_user_id,
      body: comment.body,
      created_at: toISOStringSafe(comment.created_at),
      updated_at: toISOStringSafe(comment.updated_at),
      deleted_at: comment.deleted_at
        ? toISOStringSafe(comment.deleted_at)
        : null,
    };
  } catch {
    throw new HttpException("Comment not found", 404);
  }
}
