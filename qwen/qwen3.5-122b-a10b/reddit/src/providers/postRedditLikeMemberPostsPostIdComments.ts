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
import { RedditLikeCommentCollector } from "../collectors/RedditLikeCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommentTransformer } from "../transformers/RedditLikeCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditLikeComment.ICreate;
}): Promise<IRedditLikeComment> {
  // 1. Validate post exists and is not deleted
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  // 2. Validate content is non-empty after trimming
  const content = props.body.content.trim();
  if (content.length === 0) {
    throw new HttpException("Content must be non-empty", 400);
  }
  // 3. If parentId provided, validate parent comment exists and belongs to same post
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parent = await MyGlobal.prisma.reddit_like_comments.findUniqueOrThrow(
      {
        where: { id: props.body.parentId },
        select: { reddit_like_post_id: true },
      } satisfies Prisma.reddit_like_commentsFindUniqueArgs,
    );
    if (parent.reddit_like_post_id !== props.postId) {
      throw new HttpException(
        "Parent comment must belong to the same post",
        400,
      );
    }
  }
  // 4. Create the comment using Collector
  const record = await MyGlobal.prisma.reddit_like_comments.create({
    data: await RedditLikeCommentCollector.collect({
      body: { ...props.body, content },
      redditLikePosts: { id: props.postId },
      redditLikeMembers: { id: props.member.id },
      redditLikeMemberSessions: { id: props.member.session_id },
    }),
    ...RedditLikeCommentTransformer.select(),
  });
  // 5. Transform and return
  return await RedditLikeCommentTransformer.transform(record);
}
