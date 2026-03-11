import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostImageCollector } from "../collectors/RedditPlatformPostImageCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostImageTransformer } from "../transformers/RedditPlatformPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberPostsPostIdImages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPostImage.ICreate;
}): Promise<IRedditPlatformPostImage> {
  // Validate post exists and get required fields
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_platform_member_id: true,
      reddit_platform_community_id: true,
      post_type: true,
    },
  });
  // Validate post type is IMAGE
  if (post.post_type !== "IMAGE") {
    throw new HttpException("Post type does not support images", 400);
  }
  // Validate post ownership: author or community moderator
  const isAuthor = post.reddit_platform_member_id === props.member.id;
  if (!isAuthor) {
    // Check if member is moderator of the post's community
    const moderation =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          community_id: post.reddit_platform_community_id,
          user_id: props.member.id,
        },
      });
    if (moderation === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Create image record
  const created = await MyGlobal.prisma.reddit_platform_post_images.create({
    data: await RedditPlatformPostImageCollector.collect({
      body: props.body,
      redditPlatformPosts: { id: props.postId },
    }),
    ...RedditPlatformPostImageTransformer.select(),
  });
  return await RedditPlatformPostImageTransformer.transform(created);
}
