import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

export async function getCommunityBbsCommunitiesCommunitySlug(props: {
  communitySlug: string;
}): Promise<ICommunityBbsCommunity> {
  const { communitySlug } = props;

  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { slug: communitySlug },
    include: {
      creator: true,
      community_bbs_community_settings: true,
    },
  });

  if (!community) throw new HttpException("Not Found", 404);

  if (community.deleted_at) throw new HttpException("Not Found", 404);

  // No authentication context provided: only public communities are visible
  if (community.visibility !== "public")
    throw new HttpException("Not Found", 404);

  const creator = community.creator;
  if (!creator) throw new HttpException("Not Found", 404);

  const settingsRow = community.community_bbs_community_settings;
  const community_settings = settingsRow
    ? {
        id: settingsRow.id as string & tags.Format<"uuid">,
        community_id: settingsRow.community_id as string & tags.Format<"uuid">,
        visibility: settingsRow.visibility as
          | "public"
          | "restricted"
          | "private",
        require_post_approval: settingsRow.require_post_approval ?? undefined,
        max_images_per_post:
          settingsRow.max_images_per_post === null
            ? null
            : (settingsRow.max_images_per_post as number & tags.Type<"int32">),
        allowed_image_mime_types: settingsRow.allowed_image_mime_types
          ? settingsRow.allowed_image_mime_types
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        created_at: toISOStringSafe(settingsRow.created_at),
        updated_at: toISOStringSafe(settingsRow.updated_at),
        deleted_at: settingsRow.deleted_at
          ? toISOStringSafe(settingsRow.deleted_at)
          : undefined,
      }
    : undefined;

  return {
    id: community.id as string & tags.Format<"uuid">,
    name: community.name,
    slug: community.slug,
    description: community.description ?? undefined,
    visibility: community.visibility as "public" | "restricted" | "private",
    post_approval_required: community.post_approval_required,
    creator: {
      id: creator.id as string & tags.Format<"uuid">,
      username: creator.username,
      display_name: creator.display_name ?? undefined,
      karma: creator.karma as number & tags.Type<"int32">,
      created_at: toISOStringSafe(creator.created_at),
      updated_at: toISOStringSafe(creator.updated_at),
    },
    members_count: community.members_count as number & tags.Type<"int32">,
    posts_count: community.posts_count as number & tags.Type<"int32">,
    community_settings: community_settings ?? undefined,
    created_at: toISOStringSafe(community.created_at),
    updated_at: toISOStringSafe(community.updated_at),
    deleted_at: undefined,
  };
}
