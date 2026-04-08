import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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

export async function putRedditCloneMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IUpdate;
}): Promise<IRedditCloneComment> {
  const userProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: { reddit_clone_member_id: props.member.id },
      select: { id: true },
    });
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_user_profile_id: true,
        reddit_clone_post_id: true,
        deleted_at: true,
      },
    },
  );
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.reddit_clone_user_profile_id !== userProfile.id) {
    throw new HttpException("You are not authorized to edit this comment", 403);
  }
  if (comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  if (
    props.body.content !== undefined &&
    props.body.content.trim().length === 0
  ) {
    throw new HttpException("Content cannot be empty", 400);
  }
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      ...(props.body.content !== undefined && { content: props.body.content }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      ...RedditCloneCommentTransformer.select(),
    },
  );
  return await RedditCloneCommentTransformer.transform(updated);
}
