import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommentCollector } from "../collectors/RedditCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommentAtSummaryTransformer } from "../transformers/RedditCommentAtSummaryTransformer";
import { RedditCommentTransformer } from "../transformers/RedditCommentTransformer";
import { RedditPostTextAtSummaryTransformer } from "../transformers/RedditPostTextAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditComment.ICreate;
}): Promise<IRedditComment> {
  await MyGlobal.prisma.reddit_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const created = await MyGlobal.prisma.reddit_comments.create({
    data: await RedditCommentCollector.collect({
      body: props.body,
      redditPosts: { id: props.postId },
      redditComments: undefined,
    }),
  });
  const fullComment = await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
    where: { id: created.id },
    select: {
      id: true,
      content: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      post: RedditPostTextAtSummaryTransformer.select(),
      parent: RedditCommentAtSummaryTransformer.select(),
      replies: RedditCommentAtSummaryTransformer.select(),
      snapshots: true,
      votes: true,
    },
  });
  return await RedditCommentTransformer.transform(fullComment);
}
