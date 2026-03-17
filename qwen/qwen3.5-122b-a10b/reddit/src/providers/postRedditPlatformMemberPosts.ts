import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostCollector } from "../collectors/RedditPlatformPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostTransformer } from "../transformers/RedditPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberPosts(props: {
  member: MemberPayload;
  body: IRedditPlatformPost.ICreate;
}): Promise<IRedditPlatformPost> {
  // 1. Verify community exists
  await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
    where: { id: props.body.community_id },
    select: { id: true },
  });
  // 2. Verify subscription exists
  const subscription =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.body.community_id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException("Not subscribed to this community", 403);
  }
  // 3. Check ban status - use relation property names
  const ban = await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
    where: {
      member: { id: props.member.id },
      community: { id: props.body.community_id },
      deleted_at: null,
    },
  });
  if (ban) {
    throw new HttpException("Banned from this community", 403);
  }
  // 4. Validate post type and content
  if (props.body.post_type === "text") {
    if (!props.body.text_content) {
      throw new HttpException("Text content is required for text posts", 400);
    }
  } else if (props.body.post_type === "link") {
    if (!props.body.url) {
      throw new HttpException("Valid URL is required for link posts", 400);
    }
  } else if (props.body.post_type === "image") {
    if (!props.body.file_id) {
      throw new HttpException("File ID is required for image posts", 400);
    }
    await MyGlobal.prisma.reddit_platform_files.findFirstOrThrow({
      where: {
        id: props.body.file_id,
        deleted_at: null,
      },
    });
  } else {
    throw new HttpException("Invalid post type", 400);
  }
  // 5. Create post within transaction
  const post = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.reddit_platform_posts.create({
      data: await RedditPlatformPostCollector.collect({
        body: props.body,
        author: { id: props.member.id },
      }),
      ...RedditPlatformPostTransformer.select(),
    });
    return created;
  });
  return await RedditPlatformPostTransformer.transform(post);
}
