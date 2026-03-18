import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformCommunityModeratorsCommunityModeratorId(props: {
  communityModeratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
    {
      where: { id: props.communityModeratorId },
      select: {
        id: true,
        community_id: true,
        moderator_user_id: true,
        deleted_at: true,
      },
    },
  );
  // authorization + delete will be implemented after we load full context in revise phase
  await MyGlobal.prisma.community_platform_community_moderators.delete({
    where: { id: props.communityModeratorId },
  });
}
