import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // Step 1: Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.body.communityId },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Step 2: Check active subscription (member must be subscribed to post)
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findUnique({
      where: {
        member_id_community_id: {
          member_id: props.member.id,
          community_id: props.body.communityId,
        },
      },
    });
  if (subscription === null || subscription.is_active !== true) {
    throw new HttpException(
      "You must subscribe to this community to create posts",
      403,
    );
  }
  // Step 3: Check ban status (banned members cannot create posts)
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        community_id: props.body.communityId,
        banned_user_id: props.member.id,
        deleted_at: null,
      },
    },
  );
  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Step 4: Create post with automatic self-upvote in atomic transaction
  const postId = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const [createdPost] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_platform_posts.create({
      data: {
        id: postId,
        community_id: props.body.communityId,
        author_id: props.member.id,
        title: props.body.title,
        content_type: props.body.contentType,
        text_content: props.body.textContent ?? null,
        link_url: props.body.linkUrl ?? null,
        image_url: props.body.imageUrl ?? null,
        score: 1,
        comment_count: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      ...CommunityPlatformPostTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_votes.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        post_id: postId,
        comment_id: null,
        vote_type: "upvote",
        created_at: now,
        updated_at: now,
      },
    }),
    MyGlobal.prisma.community_platform_members.update({
      where: { id: props.member.id },
      data: {
        karma: { increment: 1 },
      },
    }),
  ]);
  return await CommunityPlatformPostTransformer.transform(createdPost);
}
