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
import { RedditCommentTransformer } from "../transformers/RedditCommentTransformer";
import { RedditPostTextAtSummaryTransformer } from "../transformers/RedditPostTextAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberCommentsParentIdReplies(props: {
  member: MemberPayload;
  parentId: string & tags.Format<"uuid">;
  body: IRedditComment.ICreate;
}): Promise<IRedditComment> {
  const parent = await MyGlobal.prisma.reddit_comments.findUniqueOrThrow({
    where: { id: props.parentId },
    select: {
      id: true,
      post: RedditPostTextAtSummaryTransformer.select(),
    },
  });
  const created = await MyGlobal.prisma.reddit_comments.create({
    data: await RedditCommentCollector.collect({
      body: props.body,
      redditPosts: parent.post,
      redditComments: parent,
    }),
    select: RedditCommentTransformer.select().select,
  });
  return await RedditCommentTransformer.transform(created);
}
