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
  postId: string;
  body: IRedditLikeComment.ICreate;
}): Promise<IRedditLikeComment> {
  // Validate post exists
  await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  const created = await MyGlobal.prisma.reddit_like_comments.create({
    data: await RedditLikeCommentCollector.collect({
      body: props.body,
      author: { id: props.member.id },
      post: { id: props.postId },
    }),
    ...RedditLikeCommentTransformer.select(),
  });
  return await RedditLikeCommentTransformer.transform(created);
}
