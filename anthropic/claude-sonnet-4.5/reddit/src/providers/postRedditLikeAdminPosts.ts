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

export async function postRedditLikeAdminPosts(props: {
  admin: AdminPayload;
  body: IRedditLikePost.ICreate;
}): Promise<IRedditLikePost> {
  const { admin, body } = props;

  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: body.community_id },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

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

  if (body.type === "link" && !body.url) {
    throw new HttpException("URL is required for link posts", 400);
  }
  if (body.type === "image" && !body.image_url) {
    throw new HttpException("Image URL is required for image posts", 400);
  }

  const memberAccount = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      id: admin.id,
      deleted_at: null,
    },
  });

  if (!memberAccount) {
    throw new HttpException(
      "Administrator account requires a corresponding member record to create posts",
      403,
    );
  }

  const postId = v4() as string & tags.Format<"uuid">;
  const contentId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const createdPost = await MyGlobal.prisma.reddit_like_posts.create({
    data: {
      id: postId,
      reddit_like_member_id: admin.id,
      reddit_like_community_id: body.community_id,
      type: body.type,
      title: body.title,
      created_at: now,
      updated_at: now,
    },
  });

  if (body.type === "text") {
    await MyGlobal.prisma.reddit_like_post_text_content.create({
      data: {
        id: contentId,
        reddit_like_post_id: postId,
        body: body.body ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.type === "link") {
    if (!body.url) {
      throw new HttpException("URL is required for link posts", 400);
    }

    let domain = "";
    try {
      const urlObject = new URL(body.url);
      domain = urlObject.hostname;
    } catch (error) {
      throw new HttpException("Invalid URL format for link post", 400);
    }

    await MyGlobal.prisma.reddit_like_post_link_content.create({
      data: {
        id: contentId,
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

    await MyGlobal.prisma.reddit_like_post_image_content.create({
      data: {
        id: contentId,
        reddit_like_post_id: postId,
        original_image_url: body.image_url,
        medium_image_url: body.image_url,
        thumbnail_image_url: body.image_url,
        image_width: 1920,
        image_height: 1080,
        file_size: 1048576,
        file_format: "JPEG",
        caption: body.caption ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  return {
    id: createdPost.id as string & tags.Format<"uuid">,
    type: createdPost.type,
    title: createdPost.title,
    created_at: toISOStringSafe(createdPost.created_at),
    updated_at: toISOStringSafe(createdPost.updated_at),
  };
}
