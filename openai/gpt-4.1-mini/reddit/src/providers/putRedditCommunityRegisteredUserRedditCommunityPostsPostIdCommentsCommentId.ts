import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComments";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityPostsPostIdCommentsCommentId(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityComments.IUpdate;
}): Promise<IRedditCommunityComments> {
  const found = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.commentId },
  });

  if (!found || found.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }

  if (found.reddit_community_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      404,
    );
  }

  if (found.reddit_community_registereduser_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.reddit_community_comments.update({
    where: { id: props.commentId },
    data: {
      body: props.body.body,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    body: updated.body,
    reddit_community_post_id: updated.reddit_community_post_id,
    parent_id: updated.parent_id === null ? undefined : updated.parent_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
