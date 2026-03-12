import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IUpdate;
}): Promise<IRedditCloneComment> {
  // Find the comment and verify ownership
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: {
        id: props.commentId,
      },
      select: {
        id: true,
        reddit_clone_member_id: true,
        deleted_at: true,
      },
    },
  );
  // Check if comment is deleted
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  // Verify ownership - only author can edit
  if (comment.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the comment and return the updated record
  const updatedComment = await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
    ...RedditCloneCommentTransformer.select(),
  });
  return await RedditCloneCommentTransformer.transform(updatedComment);
}
