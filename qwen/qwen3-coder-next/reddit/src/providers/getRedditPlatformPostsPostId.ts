import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostTransformer } from "../transformers/RedditPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostsPostId(props: {
  postId: string;
}): Promise<IRedditPlatformPost> {
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
    ...RedditPlatformPostTransformer.select(),
  });
  if (!post) throw new HttpException("Post not found", 404);
  return await RedditPlatformPostTransformer.transform(post);
}
