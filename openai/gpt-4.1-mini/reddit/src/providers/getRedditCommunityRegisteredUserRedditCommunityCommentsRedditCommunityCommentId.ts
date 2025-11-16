import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function getRedditCommunityRegisteredUserRedditCommunityCommentsRedditCommunityCommentId(props: {
  registeredUser: RegisteredUserPayload;
  redditCommunityCommentId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityComment> {
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.redditCommunityCommentId },
    select: {
      id: true,
      reddit_community_post_id: true,
      reddit_community_registered_user_id: true,
      content: true,
      parent_id: true,
      created_at: true,
      updated_at: true,
      // Removed votes_count from select, not accessible
    },
  });

  if (!comment) {
    throw new HttpException("Reddit community comment not found", 404);
  }

  return {
    id: comment.id,
    post_id: comment.reddit_community_post_id,
    author_id: comment.reddit_community_registered_user_id,
    content: comment.content,
    parent_comment_id:
      comment.parent_id === null ? undefined : comment.parent_id,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    votes_count: 0, // Providing default since prisma does not have this field
  };
}
