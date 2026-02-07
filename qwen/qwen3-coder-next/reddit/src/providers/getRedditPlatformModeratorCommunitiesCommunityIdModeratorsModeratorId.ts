import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunityRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformModeratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  communityId: string;
  moderatorId: string;
}): Promise<IRedditPlatformCommunityRole> {
  const role = await MyGlobal.prisma.reddit_platform_community_roles.findFirst({
    where: {
      community_id: props.communityId,
      user_id: props.moderatorId,
    },
  });
  if (!role) {
    throw new HttpException(
      "Moderator role not found in the specified community",
      404,
    );
  }
  return {
    id: role.id,
    community_id: role.community_id,
    user_id: role.user_id,
    role: role.role,
    created_at: toISOStringSafe(role.created_at),
    updated_at: toISOStringSafe(role.updated_at),
  };
}
