import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  const id = v4();
  // Validate content type
  if (!["text", "link", "image"].includes(props.body.content_type)) {
    throw new HttpException("Invalid content type", 400);
  }
  // Validate content based on type
  if (
    props.body.content_type === "text" &&
    props.body.textContent !== undefined
  ) {
    if (props.body.textContent.length > 500) {
      throw new HttpException(
        "Text content exceeds maximum 500 characters",
        400,
      );
    }
  }
  if (props.body.content_type === "link" && props.body.url !== undefined) {
    if (props.body.url.length > 2000) {
      throw new HttpException("URL exceeds maximum 2000 characters", 400);
    }
    if (
      !props.body.url.startsWith("http://") &&
      !props.body.url.startsWith("https://")
    ) {
      throw new HttpException("URL must begin with http:// or https://", 400);
    }
  }
  if (
    props.body.content_type === "image" &&
    props.body.imageUrl !== undefined
  ) {
    if (props.body.imageUrl.length > 2000) {
      throw new HttpException("Image URL exceeds maximum 2000 characters", 400);
    }
    if (
      !props.body.imageUrl.startsWith("http://") &&
      !props.body.imageUrl.startsWith("https://")
    ) {
      throw new HttpException(
        "Image URL must begin with http:// or https://",
        400,
      );
    }
  }
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.body.community_id },
      include: { owner: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  const memberExists =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        community_id: props.body.community_id,
        memberId: props.member.id,
      },
    });
  if (!memberExists) {
    throw new HttpException("User is not subscribed to this community", 403);
  }
  // Create the main post record
  const createdPost = await MyGlobal.prisma.community_platform_posts.create({
    data: {
      id,
      title: props.body.title,
      content_type: props.body.content_type,
      created_at: new Date(),
      updated_at: new Date(),
      community: {
        connect: { id: props.body.community_id },
      },
      author: {
        connect: { id: props.member.id },
      },
    },
  });
  // Save content to appropriate table based on content_type
  if (
    props.body.content_type === "text" &&
    props.body.textContent !== undefined
  ) {
    await MyGlobal.prisma.community_platform_post_text_contents.create({
      data: {
        id: v4(),
        textContent: props.body.textContent,
        post: { connect: { id: createdPost.id } },
      },
    });
  }
  if (props.body.content_type === "link" && props.body.url !== undefined) {
    const domainName = new URL(props.body.url).hostname;
    await MyGlobal.prisma.community_platform_post_links.create({
      data: {
        id: v4(),
        url: props.body.url,
        domain_name: domainName,
        post: { connect: { id: createdPost.id } },
      },
    });
  }
  if (
    props.body.content_type === "image" &&
    props.body.imageUrl !== undefined
  ) {
    await MyGlobal.prisma.community_platform_post_images.create({
      data: {
        id: v4(),
        image_url: props.body.imageUrl,
        thumbnail_url: props.body.imageUrl,
        created_at: new Date(),
        updated_at: new Date(),
        post: { connect: { id: createdPost.id } },
      },
    });
  }
  // Return transformed post with proper formatting
  return {
    id: createdPost.id,
    title: createdPost.title,
    content_type: createdPost.content_type as "text" | "link" | "image",
    created_at: toISOStringSafe(createdPost.created_at),
    updated_at: toISOStringSafe(createdPost.updated_at),
    deleted_at: createdPost.deleted_at
      ? toISOStringSafe(createdPost.deleted_at)
      : null,
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
      icon_url: community.icon_url,
      created_at: toISOStringSafe(community.created_at),
      updated_at: toISOStringSafe(community.updated_at),
      deleted_at: community.deleted_at
        ? toISOStringSafe(community.deleted_at)
        : null,
      owner: {
        id: community.owner.id,
        name: community.owner.email,
      },
    },
    author: {
      id: props.member.id,
      name: "User " + props.member.id.substr(0, 4),
    },
    comments: [],
  };
}
