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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostLinkTransformer } from "../transformers/CommunityPlatformPostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putCommunityPlatformMemberPostsPostIdLinksLinkId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  linkId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.IUpdate;
}): Promise<ICommunityPlatformPostLink> {
  // First verify link exists and belongs to the specified post
  const link =
    await MyGlobal.prisma.community_platform_post_links.findUniqueOrThrow({
      where: { id: props.linkId },
      select: {
        id: true,
        community_platform_post_id: true,
      },
    });
  // Ensure link belongs to the specified post
  if (link.community_platform_post_id !== props.postId) {
    throw new HttpException("Link does not belong to the specified post", 404);
  }
  // Verify post exists, belongs to member, and is a LINK type post
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        content_type: true,
      },
    },
  );
  // Ownership check - member must be post author
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Business rule: Link posts cannot change type to text or image
  if (post.content_type !== "LINK") {
    throw new HttpException("Post is not a link type post", 400);
  }
  // Prepare update data with proper Prisma type
  const updateData: Prisma.community_platform_post_linksUpdateInput = {
    updated_at: new Date().toISOString(),
  };
  // Handle URL update with domain extraction if URL is provided
  if (props.body.url !== undefined) {
    // Validate URL format
    try {
      new URL(props.body.url);
    } catch (error) {
      throw new HttpException("Invalid URL format", 400);
    }
    // Extract domain (same logic as in Collector)
    let domain: string;
    try {
      const urlObj = new URL(props.body.url);
      domain = urlObj.hostname.replace(/^www\./, "");
    } catch (error) {
      // Fallback extraction
      const url = props.body.url;
      const domainMatch = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/?#]+)/);
      domain = domainMatch ? domainMatch[1] : "unknown";
    }
    updateData.url = props.body.url;
    updateData.domain = domain;
  }
  // Handle optional fields with null handling
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.thumbnail_url !== undefined) {
    // Validate thumbnail URL format if provided (not null)
    if (props.body.thumbnail_url !== null) {
      try {
        new URL(props.body.thumbnail_url);
      } catch (error) {
        throw new HttpException("Invalid thumbnail URL format", 400);
      }
    }
    updateData.thumbnail_url = props.body.thumbnail_url;
  }
  // Update link record
  await MyGlobal.prisma.community_platform_post_links.update({
    where: { id: props.linkId },
    data: updateData,
  });
  // Update parent post's updated_at timestamp
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      updated_at: new Date().toISOString(),
    },
  });
  // Fetch updated link with transformer for response
  const updatedLink =
    await MyGlobal.prisma.community_platform_post_links.findUniqueOrThrow({
      where: { id: props.linkId },
      ...CommunityPlatformPostLinkTransformer.select(),
    });
  return await CommunityPlatformPostLinkTransformer.transform(updatedLink);
}
