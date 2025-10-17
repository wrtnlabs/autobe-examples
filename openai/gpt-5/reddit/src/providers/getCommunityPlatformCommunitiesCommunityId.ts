import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function getCommunityPlatformCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunity> {
  const found = await MyGlobal.prisma.community_platform_communities.findFirst({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      display_name: true,
      description: true,
      visibility: true,
      nsfw: true,
      auto_archive_days: true,
      language: true,
      region: true,
      quarantined: true,
      quarantined_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!found) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: found.id as string & tags.Format<"uuid">,
    name: found.name,
    display_name: found.display_name ?? null,
    description: found.description ?? null,
    visibility: found.visibility,
    nsfw: found.nsfw,
    auto_archive_days: found.auto_archive_days as number & tags.Type<"int32">,
    language: found.language ?? null,
    region: found.region ?? null,
    quarantined: found.quarantined,
    quarantined_at: found.quarantined_at
      ? toISOStringSafe(found.quarantined_at)
      : null,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
  };
}
