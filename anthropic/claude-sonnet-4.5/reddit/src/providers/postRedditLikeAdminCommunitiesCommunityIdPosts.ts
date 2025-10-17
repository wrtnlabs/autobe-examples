import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminCommunitiesCommunityIdPosts(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikePost.ICreate;
}): Promise<IRedditLikePost> {
  const { admin, communityId, body } = props;

  /**
   * SCHEMA-API CONTRADICTION:
   *
   * - Reddit_like_posts.reddit_like_member_id has foreign key to
   *   reddit_like_members table
   * - Admin authentication uses reddit_like_admins table
   * - API spec states admins can create posts, but schema only allows members as
   *   authors
   *
   * This will cause foreign key constraint error unless admin.id also exists in
   * members table. Schema should be updated to support admin posts or API
   * should use member-only endpoint.
   */

  // Verify admin exists and is active
  const adminAccount = await MyGlobal.prisma.reddit_like_admins.findFirst({
    where: {
      id: admin.id,
      deleted_at: null,
    },
  });

  if (!adminAccount) {
    throw new HttpException("Admin account not found or deleted", 404);
  }

  // Verify community exists and is active
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: communityId,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found or deleted", 404);
  }

  // Validate post type is one of the allowed values
  if (!["text", "link", "image"].includes(body.type)) {
    throw new HttpException(
      "Invalid post type. Must be 'text', 'link', or 'image'",
      400,
    );
  }

  // Validate post type is enabled in community
  if (body.type === "text" && !community.allow_text_posts) {
    throw new HttpException(
      "Text posts are not allowed in this community",
      403,
    );
  }
  if (body.type === "link" && !community.allow_link_posts) {
    throw new HttpException(
      "Link posts are not allowed in this community",
      403,
    );
  }
  if (body.type === "image" && !community.allow_image_posts) {
    throw new HttpException(
      "Image posts are not allowed in this community",
      403,
    );
  }

  const now = toISOStringSafe(new Date());
  const postId = v4() as string & tags.Format<"uuid">;

  // Create main post record
  const post = await MyGlobal.prisma.reddit_like_posts.create({
    data: {
      id: postId,
      reddit_like_member_id: admin.id,
      reddit_like_community_id: communityId,
      type: body.type,
      title: body.title,
      created_at: now,
      updated_at: now,
    },
  });

  // Create type-specific content based on discriminator
  if (body.type === "text") {
    const textContentId = v4() as string & tags.Format<"uuid">;
    await MyGlobal.prisma.reddit_like_post_text_content.create({
      data: {
        id: textContentId,
        reddit_like_post_id: postId,
        body: body.body !== undefined ? body.body : null,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.type === "link") {
    if (!body.url) {
      throw new HttpException("URL is required for link posts", 400);
    }

    let domain: string;
    try {
      const urlObj = new URL(body.url);
      domain = urlObj.hostname;
    } catch (error) {
      throw new HttpException("Invalid URL format", 400);
    }

    const linkContentId = v4() as string & tags.Format<"uuid">;
    await MyGlobal.prisma.reddit_like_post_link_content.create({
      data: {
        id: linkContentId,
        reddit_like_post_id: postId,
        url: body.url,
        domain: domain,
        preview_title: null,
        preview_description: null,
        preview_image_url: null,
        metadata_fetched_at: null,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.type === "image") {
    if (!body.image_url) {
      throw new HttpException("Image URL is required for image posts", 400);
    }

    /**
     * NOTE: Image metadata requires actual image processing in production.
     * Current placeholder values (1920x1080, 1MB, JPEG) should be replaced
     * with:
     *
     * - Actual image dimension extraction
     * - Real file size calculation
     * - Detected file format from image headers
     * - Generated medium (640px) and thumbnail (150x150) URLs
     */
    const imageContentId = v4() as string & tags.Format<"uuid">;
    await MyGlobal.prisma.reddit_like_post_image_content.create({
      data: {
        id: imageContentId,
        reddit_like_post_id: postId,
        original_image_url: body.image_url,
        medium_image_url: body.image_url,
        thumbnail_image_url: body.image_url,
        image_width: 1920,
        image_height: 1080,
        file_size: 1048576,
        file_format: "JPEG",
        caption: body.caption !== undefined ? body.caption : null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  return {
    id: post.id as string & tags.Format<"uuid">,
    type: post.type,
    title: post.title,
    created_at: toISOStringSafe(post.created_at),
    updated_at: toISOStringSafe(post.updated_at),
  };
}
