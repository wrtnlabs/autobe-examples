import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostLinkCollector } from "../collectors/CommunityPlatformPostLinkCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostLinkTransformer } from "../transformers/CommunityPlatformPostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdLinks(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.ICreate;
}): Promise<ICommunityPlatformPostLink> {
  // Use transaction for data consistency
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    // 1. Verify post exists, get post details with community context
    const post = await prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        content_type: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
      },
    });
    // 2. Verify post type is LINK
    if (post.content_type !== "LINK") {
      throw new HttpException(
        "Post must be of type LINK to attach link metadata",
        400,
      );
    }
    // 3. Check permission: post author OR community moderator
    const isAuthor = post.community_platform_member_id === props.member.id;
    if (!isAuthor) {
      // Check if member is moderator of the community
      const moderationRole =
        await prisma.community_platform_moderation_roles.findFirst({
          where: {
            community_platform_member_id: props.member.id,
            community_platform_community_id:
              post.community_platform_community_id,
            deleted_at: null,
          },
        });
      if (!moderationRole) {
        throw new HttpException(
          "You do not have permission to modify this post",
          403,
        );
      }
    }
    // 4. Check no existing link for this post (enforce 1:1 relationship)
    const existingLink = await prisma.community_platform_post_links.findUnique({
      where: { community_platform_post_id: props.postId },
    });
    if (existingLink) {
      throw new HttpException(
        "Link metadata already exists for this post",
        409,
      );
    }
    // 5. Use Collector to prepare data
    const data = await CommunityPlatformPostLinkCollector.collect({
      body: props.body,
      post: { id: post.id } satisfies IEntity,
    });
    // 6. Create link record
    const created = await prisma.community_platform_post_links.create({
      data,
      ...CommunityPlatformPostLinkTransformer.select(),
    });
    // 7. Transform and return
    return await CommunityPlatformPostLinkTransformer.transform(created);
  });
}
