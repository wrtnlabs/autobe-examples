import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putCommunityPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  const { user, postId, body } = props;
  // Fetch post with related content to determine content type
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: postId },
    include: {
      community_platform_post_texts: true,
      community_platform_post_links: true,
      community_platform_post_images: true,
      user: true,
      community: true,
    },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Post not found or deleted", 404);
  }
  // Only the creator can edit (future: allow mods/admins as per requirements)
  if (post.community_platform_user_id !== user.id) {
    throw new HttpException("Unauthorized: Only the post owner can edit", 403);
  }

  const now = toISOStringSafe(new Date());
  // --- Content type check and update ---
  // Determine post type
  const isText = Boolean(post.community_platform_post_texts);
  const isLink = Boolean(post.community_platform_post_links);
  const isImage =
    Array.isArray(post.community_platform_post_images) &&
    post.community_platform_post_images.length > 0;

  // Disallow any attempt to change content type or update multiple content types
  const fieldsProvided = [
    body.body !== undefined ? 1 : 0,
    body.url !== undefined ? 1 : 0,
    body.images !== undefined ? 1 : 0,
  ].reduce((sum, cur) => sum + cur, 0);
  if (fieldsProvided > 1) {
    throw new HttpException(
      "Only one type of content field (body, url, or images) may be updated per post. Content type cannot change.",
      400,
    );
  }

  if (
    (isText && (body.url !== undefined || body.images !== undefined)) ||
    (isLink && (body.body !== undefined || body.images !== undefined)) ||
    (isImage && (body.body !== undefined || body.url !== undefined))
  ) {
    throw new HttpException(
      "Attempt to change content type; only the current content field can be updated.",
      400,
    );
  }

  // Prepare snapshot from old
  const snapshot_body =
    isText && post.community_platform_post_texts
      ? post.community_platform_post_texts.body
      : null;
  const snapshot_url =
    isLink && post.community_platform_post_links
      ? post.community_platform_post_links.url
      : null;
  const snapshot_image_uri =
    isImage && post.community_platform_post_images.length > 0
      ? post.community_platform_post_images[0].uri
      : null;
  const edit_type = isText ? "text" : isLink ? "link" : isImage ? "image" : "";

  // Save edit history
  await MyGlobal.prisma.community_platform_post_edit_histories.create({
    data: {
      id: v4(),
      community_platform_post_id: postId,
      community_platform_user_id: user.id,
      edit_type,
      snapshot_title: post.title,
      snapshot_body,
      snapshot_url,
      snapshot_image_uri,
      edit_reason:
        body.edit_reason !== undefined ? body.edit_reason : undefined,
      created_at: now,
    },
  });

  // Update title always (required)
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: postId },
    data: {
      title: body.title,
      updated_at: now,
    },
  });

  // Update appropriate content table
  if (isText && body.body !== undefined) {
    await MyGlobal.prisma.community_platform_post_texts.update({
      where: { community_platform_post_id: postId },
      data: { body: body.body },
    });
  } else if (isLink && body.url !== undefined) {
    await MyGlobal.prisma.community_platform_post_links.update({
      where: { community_platform_post_id: postId },
      data: {
        url: body.url,
        summary: undefined,
      },
    });
  } else if (isImage && body.images !== undefined) {
    // For simplicity: delete old, insert new images (could optimize diff in future)
    await MyGlobal.prisma.community_platform_post_images.deleteMany({
      where: { community_platform_post_id: postId },
    });
    for (const img of body.images) {
      await MyGlobal.prisma.community_platform_post_images.create({
        data: {
          id: v4(),
          community_platform_post_id: postId,
          uri: img.uri,
          file_type: img.file_type,
          file_size_bytes: img.file_size_bytes,
        },
      });
    }
  }

  // Re-fetch post with latest content and references for return
  const updated =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: postId },
      include: {
        community_platform_post_texts: true,
        community_platform_post_links: true,
        community_platform_post_images: true,
        user: true,
        community: true,
      },
    });

  // Build response DTO
  return {
    id: updated.id,
    title: updated.title,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
    author: {
      id: updated.user.id,
      display_name: updated.user.display_name,
    },
    community: {
      id: updated.community.id,
      name: updated.community.name,
      description: updated.community.description,
    },
    text_content: updated.community_platform_post_texts
      ? { body: updated.community_platform_post_texts.body }
      : null,
    link_content: updated.community_platform_post_links
      ? {
          url: updated.community_platform_post_links.url,
          summary:
            updated.community_platform_post_links.summary !== null &&
            updated.community_platform_post_links.summary !== undefined
              ? updated.community_platform_post_links.summary
              : undefined,
        }
      : null,
    image_contents: Array.isArray(updated.community_platform_post_images)
      ? updated.community_platform_post_images.map((img) => ({
          uri: img.uri,
          file_type: img.file_type,
          file_size_bytes: img.file_size_bytes,
        }))
      : [],
  };
}
