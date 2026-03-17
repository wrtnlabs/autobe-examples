import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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

export async function putCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // 1. Verify ownership and post existence
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        content_type: true,
        deleted_at: true,
      },
    },
  );
  // Check if post is deleted
  if (post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Verify member is the author
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Prepare update data
  const updateData: any = {};
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  // Always update updated_at
  updateData.updated_at = new Date();
  // 3. Handle type-specific content updates
  if (post.content_type === "TEXT") {
    if (props.body.textContent !== undefined) {
      await MyGlobal.prisma.community_platform_post_texts.update({
        where: { community_platform_post_id: props.postId },
        data: {
          content: props.body.textContent.content ?? undefined,
          formatting: props.body.textContent.formatting ?? undefined,
          content_length: props.body.textContent.content
            ? props.body.textContent.content.length
            : undefined,
        },
      });
    }
  } else if (post.content_type === "LINK") {
    if (props.body.linkContent !== undefined) {
      const linkUpdate: any = {};
      if (props.body.linkContent.url !== undefined) {
        linkUpdate.url = props.body.linkContent.url;
        // Extract domain from URL
        try {
          const url = new URL(props.body.linkContent.url);
          linkUpdate.domain = url.hostname.replace(/^www\\./, "");
        } catch {
          throw new HttpException("Invalid URL", 400);
        }
      }
      if (props.body.linkContent.title !== undefined) {
        linkUpdate.title = props.body.linkContent.title;
      }
      if (props.body.linkContent.description !== undefined) {
        linkUpdate.description = props.body.linkContent.description;
      }
      if (props.body.linkContent.thumbnail_url !== undefined) {
        linkUpdate.thumbnail_url = props.body.linkContent.thumbnail_url;
      }
      linkUpdate.updated_at = new Date();
      await MyGlobal.prisma.community_platform_post_links.update({
        where: { community_platform_post_id: props.postId },
        data: linkUpdate,
      });
    }
  } else if (post.content_type === "IMAGE") {
    // IMAGE posts can only update title
    // Image replacement would be separate operation
  }
  // 4. Update main post if there are changes
  if (Object.keys(updateData).length > 0) {
    await MyGlobal.prisma.community_platform_posts.update({
      where: { id: props.postId },
      data: updateData,
    });
  }
  // 5. Fetch and return updated post
  const updated =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(updated);
}
