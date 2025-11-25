import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumPostComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityForumUserCommentsCommentId(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityForumPostComment.IUpdate;
}): Promise<ICommunityForumPostComment> {
  // First, verify the user exists
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: {
      id: props.user.id,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 403);
  }

  // Fetch the existing comment to verify ownership and edit window
  const existing = await MyGlobal.prisma.community_forum_comments.findUnique({
    where: {
      id: props.commentId,
    },
  });

  // If comment doesn't exist, throw 404
  if (!existing) {
    throw new HttpException("Comment not found", 404);
  }

  // Verify that the user is the author of the comment
  if (existing.community_forum_user_id !== props.user.id) {
    throw new HttpException("You are not authorized to edit this comment", 403);
  }

  // Check if the comment is within the 15-minute editing window
  // Parse the created_at string timestamp
  const createdTime = new Date(existing.created_at).getTime();
  const currentTime = new Date().getTime();
  const timeDifference = currentTime - createdTime;

  // 15 minutes in milliseconds = 15 * 60 * 1000 = 900000
  if (timeDifference > 900000) {
    throw new HttpException(
      "Edit window has expired. Comments can only be edited within 15 minutes of creation.",
      403,
    );
  }

  // Perform the update
  const updated = await MyGlobal.prisma.community_forum_comments.update({
    where: {
      id: props.commentId,
    },
    data: {
      body: props.body.body,
      updated_at: new Date(),
    },
  });

  // Return the updated comment with proper date formatting
  return {
    id: updated.id,
    body: updated.body,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    community_forum_post_id: updated.community_forum_post_id,
    community_forum_user_id: updated.community_forum_user_id,
    parent_id: updated.parent_id ?? undefined,
  };
}
