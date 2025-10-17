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

export async function postRedditLikeMemberPosts(props: {
  member: MemberPayload;
  body: IRedditLikePost.ICreate;
}): Promise<IRedditLikePost> {
  const { member, body } = props;

  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: body.community_id },
  });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const activeBan = await MyGlobal.prisma.reddit_like_community_bans.findFirst({
    where: {
      banned_member_id: member.id,
      community_id: body.community_id,
      is_active: true,
      deleted_at: null,
    },
  });

  if (activeBan) {
    throw new HttpException("You are banned from this community", 403);
  }

  if (community.posting_permission === "moderators_only") {
    if (community.creator_id !== member.id) {
      throw new HttpException(
        "Only the community creator can post in this community",
        403,
      );
    }
  } else if (community.posting_permission === "anyone_subscribed") {
    const isSubscribed =
      await MyGlobal.prisma.reddit_like_community_subscriptions.findFirst({
        where: {
          community_id: body.community_id,
          member_id: member.id,
        },
      });

    if (!isSubscribed) {
      throw new HttpException(
        "You must be subscribed to post in this community",
        403,
      );
    }
  }

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

  if (body.type === "link" && !body.url) {
    throw new HttpException("URL is required for link posts", 400);
  }
  if (body.type === "image" && !body.image_url) {
    throw new HttpException("Image URL is required for image posts", 400);
  }

  if (body.type === "link" && body.url) {
    try {
      const urlObject = new URL(body.url);
      if (urlObject.protocol !== "http:" && urlObject.protocol !== "https:") {
        throw new HttpException("URL must use HTTP or HTTPS protocol", 400);
      }
    } catch (error) {
      throw new HttpException("Invalid URL format", 400);
    }
  }

  const now = toISOStringSafe(new Date());
  const postId = v4() as string & tags.Format<"uuid">;

  const post = await MyGlobal.prisma.reddit_like_posts.create({
    data: {
      id: postId,
      reddit_like_member_id: member.id,
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
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_post_id: postId,
        body: body.body ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.type === "link") {
    const urlObject = new URL(body.url!);
    const domain = urlObject.hostname;

    await MyGlobal.prisma.reddit_like_post_link_content.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_post_id: postId,
        url: body.url!,
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
    await MyGlobal.prisma.reddit_like_post_image_content.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_post_id: postId,
        original_image_url: body.image_url!,
        medium_image_url: body.image_url!,
        thumbnail_image_url: body.image_url!,
        image_width: 1920,
        image_height: 1080,
        file_size: 2097152,
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
