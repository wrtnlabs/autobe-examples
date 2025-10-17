import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditLikeCommunity.ICreate;
}): Promise<IRedditLikeCommunity> {
  const { member, body } = props;

  const normalizedCode = body.code.toLowerCase();

  const existingCommunity =
    await MyGlobal.prisma.reddit_like_communities.findFirst({
      where: {
        code: normalizedCode,
        deleted_at: null,
      },
    });

  if (existingCommunity) {
    throw new HttpException("A community with this code already exists", 409);
  }

  const communityId = v4();
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_like_communities.create({
    data: {
      id: communityId,
      creator_id: member.id,
      code: normalizedCode,
      name: body.name,
      description: body.description,
      icon_url: body.icon_url ?? null,
      banner_url: body.banner_url ?? null,
      privacy_type: body.privacy_type ?? "public",
      posting_permission: body.posting_permission ?? "anyone_subscribed",
      allow_text_posts: body.allow_text_posts ?? true,
      allow_link_posts: body.allow_link_posts ?? true,
      allow_image_posts: body.allow_image_posts ?? true,
      primary_category: body.primary_category ?? "Other",
      secondary_tags: body.secondary_tags ?? null,
      subscriber_count: 0,
      is_archived: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description,
    icon_url: created.icon_url ?? undefined,
    banner_url: created.banner_url ?? undefined,
    privacy_type: created.privacy_type,
    posting_permission: created.posting_permission,
    allow_text_posts: created.allow_text_posts,
    allow_link_posts: created.allow_link_posts,
    allow_image_posts: created.allow_image_posts,
    primary_category: created.primary_category,
    secondary_tags: created.secondary_tags ?? undefined,
    subscriber_count: created.subscriber_count,
    is_archived: created.is_archived,
    created_at: now,
    updated_at: now,
  };
}
