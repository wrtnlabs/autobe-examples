import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostTransformer } from "../transformers/RedditPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPost.IUpdate;
}): Promise<IRedditPlatformPost> {
  // Verify post exists and get post with author reference for ownership check
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_platform_member_id: true,
    },
  });
  // Verify ownership - only the post author can update
  if (post.reddit_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build update data with only provided fields and always include updated_at
  const updateData: {
    title?: string;
    content?: string | null | undefined;
    post_type?: string;
    url?: string | null | undefined;
    image_url?: string | null | undefined;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  // Add fields only if provided in body
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.content !== undefined) {
    updateData.content = props.body.content;
  }
  if (props.body.post_type !== undefined) {
    updateData.post_type = props.body.post_type;
  }
  if (props.body.url !== undefined) {
    updateData.url = props.body.url;
  }
  // Note: DTO uses camelCase 'imageUrl', DB uses snake_case 'image_url'
  if (props.body.imageUrl !== undefined) {
    updateData.image_url = props.body.imageUrl;
  }
  // Update the post
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  // Fetch updated post with full relations using transformer's select
  const updated = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      ...RedditPlatformPostTransformer.select(),
    },
  );
  // Transform and return
  return await RedditPlatformPostTransformer.transform(updated);
}
