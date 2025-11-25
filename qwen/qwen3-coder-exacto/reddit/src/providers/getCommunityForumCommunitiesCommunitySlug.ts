import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";

export async function getCommunityForumCommunitiesCommunitySlug(props: {
  communitySlug: string;
}): Promise<ICommunityForumCommunityGroup> {
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: { slug: props.communitySlug },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  return {
    id: community.id,
    name: community.name,
    slug: community.slug,
    title: community.title,
    description: community.description,
    rules: community.rules,
    privacy_level: community.privacy_level as
      | "public"
      | "private"
      | "restricted",
    status: community.status as "active" | "inactive" | "archived",
    member_count: community.member_count,
    post_count: community.post_count,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: community.deleted_at
      ? toISOStringSafe(community.deleted_at)
      : undefined,
    created_by_id: community.created_by_id,
    updated_by_id: community.updated_by_id ?? undefined,
  };
}
