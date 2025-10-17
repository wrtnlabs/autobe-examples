import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditLikeModeratorPosts(props: {
  moderator: ModeratorPayload;
  body: IRedditLikePost.ICreate;
}): Promise<IRedditLikePost> {
  const { moderator, body } = props;

  // Verify community exists and is accessible
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: body.community_id,
      deleted_at: null,
    },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (community.is_archived) {
    throw new HttpException("Cannot post to archived community", 403);
  }

  // Verify moderator has permissions in this community
  const modPermission =
    await MyGlobal.prisma.reddit_like_community_moderators.findFirst({
      where: {
        community_id: body.community_id,
        moderator_id: moderator.id,
      },
    });

  if (!modPermission) {
    throw new HttpException(
      "Moderator does not have permissions in this community",
      403,
    );
  }

  // Validate post type
  if (!["text", "link", "image"].includes(body.type)) {
    throw new HttpException(
      "Invalid post type. Must be 'text', 'link', or 'image'",
      400,
    );
  }

  // Validate type-specific required fields
  if (body.type === "text" && body.body === undefined) {
    throw new HttpException("Text posts require a body field", 400);
  }
  if (body.type === "link" && !body.url) {
    throw new HttpException("Link posts require a URL", 400);
  }
  if (body.type === "image" && !body.image_url) {
    throw new HttpException("Image posts require an image URL", 400);
  }

  // Check community post type permissions
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
      reddit_like_member_id: moderator.id,
      reddit_like_community_id: body.community_id,
      type: body.type,
      title: body.title,
      created_at: now,
      updated_at: now,
    },
  });

  // Create type-specific content
  if (body.type === "text") {
    await MyGlobal.prisma.reddit_like_post_text_content.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_post_id: postId,
        body: body.body ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.type === "link" && body.url) {
    let domain: string;
    try {
      const urlObj = new URL(body.url);
      domain = urlObj.hostname;
    } catch {
      throw new HttpException("Invalid URL format", 400);
    }

    await MyGlobal.prisma.reddit_like_post_link_content.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
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
  } else if (body.type === "image" && body.image_url) {
    await MyGlobal.prisma.reddit_like_post_image_content.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_post_id: postId,
        original_image_url: body.image_url,
        medium_image_url: body.image_url,
        thumbnail_image_url: body.image_url,
        image_width: 0,
        image_height: 0,
        file_size: 0,
        file_format: "JPEG",
        caption: body.caption ?? null,
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
