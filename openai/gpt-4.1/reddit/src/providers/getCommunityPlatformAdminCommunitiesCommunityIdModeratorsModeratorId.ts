import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityPlatformAdminCommunitiesCommunityIdModeratorsModeratorId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModerator> {
  const assignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
      {
        where: {
          id: props.moderatorId,
          community_platform_community_id: props.communityId,
        },
        include: {
          user: true,
          community: true,
        },
      },
    );

  return {
    id: assignment.id,
    community: {
      id: assignment.community.id,
      name: assignment.community.name,
      description: assignment.community.description,
    },
    user: {
      id: assignment.user.id,
      display_name: assignment.user.display_name,
    },
    assigned_at: toISOStringSafe(assignment.assigned_at),
  };
}
