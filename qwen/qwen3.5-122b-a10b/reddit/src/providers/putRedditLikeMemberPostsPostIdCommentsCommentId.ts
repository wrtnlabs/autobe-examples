import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommentTransformer } from "../transformers/RedditLikeCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.IUpdate;
}): Promise<IRedditLikeComment> {
  const comment = await MyGlobal.prisma.reddit_like_comments.findUnique({
    where: { id: props.commentId },
    select: {
      id: true,
      reddit_like_member_id: true,
      deleted_at: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  if (comment.reddit_like_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  const content = props.body.content;
  if (content === undefined || content.trim().length === 0) {
    throw new HttpException("Content must be non-empty", 400);
  }
  await MyGlobal.prisma.reddit_like_comments.update({
    where: { id: props.commentId },
    data: {
      content: content.trim(),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    ...RedditLikeCommentTransformer.select(),
  });
  return await RedditLikeCommentTransformer.transform(updated);
}
