import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPostTextTransformer } from "../transformers/RedditPostTextTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPostText.IUpdate;
}): Promise<IRedditPostText> {
  await MyGlobal.prisma.reddit_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      reddit_members_id: props.member.id,
    },
  });
  if (props.body.title.length < 5) {
    throw new HttpException("Post title must be at least 5 characters", 400);
  }
  await MyGlobal.prisma.reddit_posts.update({
    where: { id: props.postId },
    data: {
      title: props.body.title,
      updated_at: new Date(),
    },
  });
  const updatedPost = await MyGlobal.prisma.reddit_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: RedditPostTextTransformer.select().select,
  });
  return await RedditPostTextTransformer.transform(updatedPost);
}
