import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPortalMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPortalPost.ICreate;
}): Promise<ICommunityPortalPost> {
  const { member, body } = props;

  // Verify target community exists and is not soft-deleted
  const community =
    await MyGlobal.prisma.community_portal_communities.findFirstOrThrow({
      where: { id: body.community_id, deleted_at: null },
    });

  // If community is private, ensure the member is subscribed
  if (community.is_private) {
    const subscription =
      await MyGlobal.prisma.community_portal_subscriptions.findFirst({
        where: {
          community_id: body.community_id,
          user_id: member.id,
          deleted_at: null,
        },
      });

    if (!subscription) {
      throw new HttpException("Forbidden: subscription required", 403);
    }
  }

  // Enforce required content fields based on post_type
  if (body.post_type === "text") {
    if (body.body === undefined || body.body === null) {
      throw new HttpException(
        "Bad Request: 'body' is required for text posts",
        400,
      );
    }
  } else if (body.post_type === "link") {
    if (body.link_url === undefined || body.link_url === null) {
      throw new HttpException(
        "Bad Request: 'link_url' is required for link posts",
        400,
      );
    }
  } else if (body.post_type === "image") {
    if (body.image_url === undefined || body.image_url === null) {
      throw new HttpException(
        "Bad Request: 'image_url' is required for image posts",
        400,
      );
    }
  } else {
    throw new HttpException("Bad Request: invalid post_type", 400);
  }

  // Prepare timestamps (ISO strings)
  const now = toISOStringSafe(new Date());

  // Determine initial moderation status
  const status = community.is_private ? "pending" : "published";

  // Create the post record
  const created = await MyGlobal.prisma.community_portal_posts.create({
    data: {
      id: v4(),
      community_id: body.community_id,
      author_user_id: member.id,
      post_type: body.post_type,
      title: body.title,
      body: body.post_type === "text" ? body.body : undefined,
      link_url: body.post_type === "link" ? body.link_url : undefined,
      image_url: body.post_type === "image" ? body.image_url : undefined,
      status,
      created_at: now,
      updated_at: now,
    },
  });

  // Map Prisma result to API DTO, converting DB nulls to undefined for optional fields
  return {
    id: created.id,
    community_id: created.community_id,
    author_user_id:
      created.author_user_id === null ? undefined : created.author_user_id,
    post_type: created.post_type,
    title: created.title,
    body: created.body === null ? undefined : created.body,
    link_url: created.link_url === null ? undefined : created.link_url,
    image_url: created.image_url === null ? undefined : created.image_url,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
