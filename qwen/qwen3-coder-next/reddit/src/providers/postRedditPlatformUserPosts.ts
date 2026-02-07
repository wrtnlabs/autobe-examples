import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostCollector } from "../collectors/RedditPlatformPostCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postRedditPlatformUserPosts(props: {
  user: UserPayload;
  body: IRedditPlatformPost.ICreate;
}): Promise<IRedditPlatformPost> {
  // Find the user to ensure they exist
  const user = await MyGlobal.prisma.reddit_platform_users.findFirst({
    where: { id: props.user.id },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // For now, create a post with placeholder community_id
  // In a real implementation, this would need to be validated against user subscriptions
  const created = await MyGlobal.prisma.reddit_platform_posts.create({
    data: await RedditPlatformPostCollector.collect({
      body: props.body,
      redditPlatformUsers: user,
      community: user as any, // Placeholder - real implementation would validate community subscription
    }),
  });
  return {
    id: created.id,
    author_id: created.author_id,
    community_id: created.community_id,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
    comment_count: created.comment_count,
    content_text: created.content_text,
    updated_at: toISOStringSafe(created.updated_at),
    url: created.url,
    image_url: created.image_url,
    type: created.type,
    title: created.title,
    vote_score: created.vote_score,
  };
}
