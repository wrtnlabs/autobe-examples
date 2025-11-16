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

export async function putRedditCommunityRegisteredUserRedditCommunityCommentsRedditCommunityCommentId(props: {
  registeredUser: RegisteredUserPayload;
  redditCommunityCommentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IUpdate;
}): Promise<IRedditCommunityComment> {
  const existing = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.redditCommunityCommentId },
  });

  if (existing === null) {
    throw new HttpException("Comment not found", 404);
  }

  if (
    existing.reddit_community_registered_user_id !== props.registeredUser.id
  ) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.redditCommunityCommentId },
    data: {
      content: props.body.content ?? existing.content,
      parent_id:
        props.body.parent_comment_id === undefined
          ? existing.parent_id
          : props.body.parent_comment_id,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  const votesCount = await MyGlobal.prisma.reddit_community_comment_votes.count(
    {
      where: { reddit_community_comment_id: props.redditCommunityCommentId },
    },
  );

  return {
    id: updated.id,
    post_id: updated.reddit_community_post_id,
    author_id: updated.reddit_community_registered_user_id,
    content: updated.content,
    parent_comment_id:
      updated.parent_id === null ? null : (updated.parent_id ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    votes_count: votesCount,
  };
}
