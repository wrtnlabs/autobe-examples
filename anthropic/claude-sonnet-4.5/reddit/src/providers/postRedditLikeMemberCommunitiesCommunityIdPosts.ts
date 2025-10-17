import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberCommunitiesCommunityIdPosts(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikePost.ICreate;
}): Promise<IRedditLikePost> {
  const { member, communityId, body } = props;

  // Verify community exists and get settings
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Check if user is banned from community
  const activeBan = await MyGlobal.prisma.reddit_like_community_bans.findFirst({
    where: {
      banned_member_id: member.id,
      community_id: communityId,
      is_active: true,
    },
  });

  if (activeBan) {
    throw new HttpException(
      "You are banned from posting in this community",
      403,
    );
  }

  // Check posting permissions based on community settings
  if (community.posting_permission === "anyone_subscribed") {
    const subscription =
      await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
        where: {
          community_id: communityId,
          member_id: member.id,
        },
      });

    if (!subscription) {
      throw new HttpException(
        "You must be subscribed to post in this community",
        403,
      );
    }
  } else if (community.posting_permission === "moderators_only") {
    // Check if member is creator of community
    const isCreator = community.creator_id === member.id;

    if (!isCreator) {
      throw new HttpException(
        "Only moderators can post in this community",
        403,
      );
    }
  }

  // Validate post type is enabled in community
  if (body.type === "text" && !community.allow_text_posts) {
    throw new HttpException(
      "Text posts are not allowed in this community",
      400,
    );
  }
  if (body.type === "link" && !community.allow_link_posts) {
    throw new HttpException(
      "Link posts are not allowed in this community",
      400,
    );
  }
  if (body.type === "image" && !community.allow_image_posts) {
    throw new HttpException(
      "Image posts are not allowed in this community",
      400,
    );
  }

  // Validate type-specific required fields
  if (body.type === "link" && !body.url) {
    throw new HttpException("URL is required for link posts", 400);
  }
  if (body.type === "image" && !body.image_url) {
    throw new HttpException("Image URL is required for image posts", 400);
  }

  // Create timestamps once
  const now = toISOStringSafe(new Date());
  const postId = v4();

  // Create main post record
  await MyGlobal.prisma.reddit_like_posts.create({
    data: {
      id: postId,
      reddit_like_member_id: member.id,
      reddit_like_community_id: communityId,
      type: body.type,
      title: body.title,
      created_at: now,
      updated_at: now,
    },
  });

  // Create type-specific content based on discriminator
  if (body.type === "text") {
    await MyGlobal.prisma.reddit_like_post_text_content.create({
      data: {
        id: v4(),
        reddit_like_post_id: postId,
        body: body.body ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.type === "link") {
    const urlObj = new URL(body.url!);
    const domain = urlObj.hostname;

    await MyGlobal.prisma.reddit_like_post_link_content.create({
      data: {
        id: v4(),
        reddit_like_post_id: postId,
        url: body.url!,
        domain: domain,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.type === "image") {
    await MyGlobal.prisma.reddit_like_post_image_content.create({
      data: {
        id: v4(),
        reddit_like_post_id: postId,
        original_image_url: body.image_url!,
        medium_image_url: body.image_url!,
        thumbnail_image_url: body.image_url!,
        image_width: 0,
        image_height: 0,
        file_size: 0,
        file_format: "JPEG",
        caption: body.caption ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });
  }

  // Return created post using already-converted timestamp
  return {
    id: postId,
    type: body.type,
    title: body.title,
    created_at: now,
    updated_at: now,
  };
}
