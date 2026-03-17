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

export async function putRedditCloneMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCloneComment.IUpdate;
}): Promise<IRedditCloneComment> {
  const comment = await MyGlobal.prisma.reddit_clone_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        reddit_clone_post_id: true,
        deleted_at: true,
        post: {
          select: {
            community_id: true,
          },
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
      },
    },
  );
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment has been deleted", 403);
  }
  if (comment.reddit_clone_post_id !== props.postId) {
    throw new HttpException(
      "Comment does not belong to the specified post",
      400,
    );
  }
  if (comment.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden: Not the comment author", 403);
  }
  const ban = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      member_id: props.member.id,
      community_id: comment.post.community_id,
      deleted_at: null,
    },
  });
  if (ban !== null) {
    throw new HttpException("Member is banned from this community", 403);
  }
  await MyGlobal.prisma.reddit_clone_comments.update({
    where: { id: props.commentId },
    data: {
      ...(props.body.body !== undefined && { body: props.body.body }),
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
