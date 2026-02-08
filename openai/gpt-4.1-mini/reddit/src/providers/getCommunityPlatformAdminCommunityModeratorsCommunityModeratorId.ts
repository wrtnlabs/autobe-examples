import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunityModeratorsCommunityModeratorId(props: {
  admin: AdminPayload;
  communityModeratorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModerator> {
  const record =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: { id: props.communityModeratorId },
      select: {
        id: true,
        community_id: true,
        community_moderator_id: true,
        role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!record) {
    throw new HttpException("CommunityModerator not found", 404);
  }
  return {
    id: record.id,
    community_id: record.community_id,
    moderator_id: record.community_moderator_id,
    role: record.role,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
