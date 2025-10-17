import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";

export async function getCommunityPlatformPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  const row = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_user_id: true,
      community_platform_community_id: true,
      title: true,
      type: true,
      body: true,
      link_url: true,
      image_url: true,
      nsfw: true,
      spoiler: true,
      visibility_state: true,
      locked_at: true,
      archived_at: true,
      edited_at: true,
      edit_count: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!row) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: row.id as string & tags.Format<"uuid">,
    community_platform_user_id: row.community_platform_user_id as string &
      tags.Format<"uuid">,
    community_platform_community_id:
      row.community_platform_community_id as string & tags.Format<"uuid">,
    title: row.title,
    type: row.type as IECommunityPlatformPostType,
    body: row.body ?? undefined,
    link_url: (row.link_url ?? undefined) as
      | (string & tags.Format<"uri">)
      | undefined,
    image_url: (row.image_url ?? undefined) as
      | (string & tags.Format<"uri">)
      | undefined,
    nsfw: row.nsfw,
    spoiler: row.spoiler,
    visibility_state: (row.visibility_state ?? undefined) as
      | IECommunityPlatformPostVisibilityState
      | undefined,
    locked_at: row.locked_at ? toISOStringSafe(row.locked_at) : null,
    archived_at: row.archived_at ? toISOStringSafe(row.archived_at) : null,
    edited_at: row.edited_at ? toISOStringSafe(row.edited_at) : null,
    edit_count: row.edit_count as number & tags.Type<"int32">,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  };
}
