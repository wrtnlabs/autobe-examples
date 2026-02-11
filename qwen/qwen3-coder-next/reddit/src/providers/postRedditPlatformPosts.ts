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

export async function postRedditPlatformPosts(props: {
  body: IRedditPlatformPost.ICreate;
}): Promise<IRedditPlatformPost> {
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { id: props.body.communityId },
    });
  if (!community) throw new HttpException("Community not found", 404);
  // Get actor ID from MyGlobal.actor or similar context
  const actorId = (MyGlobal as any).actor?.id;
  if (!actorId) throw new HttpException("Unauthorized", 401);
  const created = await MyGlobal.prisma.reddit_platform_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      title: props.body.title,
      type: props.body.type,
      content: props.body.content ?? null,
      url: props.body.url ?? null,
      image_url: props.body.imageUrl ?? null,
      vote_score: 0,
      comment_count: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      author: { connect: { id: actorId } },
      community: { connect: { id: props.body.communityId } },
    } satisfies Prisma.reddit_platform_postsCreateInput,
    ...RedditPlatformPostTransformer.select(),
  });
  return await RedditPlatformPostTransformer.transform(created);
}
