import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneModeratorPostsPostIdCommentsCommentId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the comment with its post and community information
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_post_id: true,
        post: {
          select: {
            id: true,
            reddit_clone_community_id: true,
          },
        },
      },
    },
  );
  // Verify the comment belongs to the specified post
  if (comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException("Comment not found", 404);
  }
  // Check if the moderator is authorized to delete comments in this community
  const moderatorRecord =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: comment.post.reddit_clone_community_id,
        reddit_clone_user_profile_id: props.moderator.id,
        deleted_at: null,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Soft delete the comment by setting deleted_at
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      deleted_at: new Date(),
    },
  });
}
