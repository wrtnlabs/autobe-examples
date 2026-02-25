import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentFull } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentFull";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentCollector } from "../collectors/RedditCommunityCommentCollector";
import { RedditCommunityCommentFullTransformer } from "../transformers/RedditCommunityCommentFullTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityPostsPostIdComments(props: {
  postId: string;
  body: IRedditCommunityComment.ICreate;
}): Promise<IRedditCommunityCommentFull> {
  // Validate post exists (will throw 404 if not found or deleted)
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  // Use Collector to build create input
  const created = await MyGlobal.prisma.reddit_community_comments.create({
    data: await RedditCommunityCommentCollector.collect({
      body: props.body,
      redditCommunityMembers: { id: MyGlobal.authenticatedActor.id },
      redditCommunityPosts: { id: props.postId },
    }),
    ...RedditCommunityCommentFullTransformer.select(),
  });
  // Transform to response DTO
  return await RedditCommunityCommentFullTransformer.transform(created);
}
