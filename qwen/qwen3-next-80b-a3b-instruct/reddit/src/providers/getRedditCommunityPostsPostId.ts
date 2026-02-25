import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentFull } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentFull";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPostWithComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostWithComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostWithCommentTransformer } from "../transformers/RedditCommunityPostWithCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostWithComment> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    ...RedditCommunityPostWithCommentTransformer.select(),
  });
  return await RedditCommunityPostWithCommentTransformer.transform(post);
}
