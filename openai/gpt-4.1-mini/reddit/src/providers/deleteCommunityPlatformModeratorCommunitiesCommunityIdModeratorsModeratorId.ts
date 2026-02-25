import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteCommunityPlatformModeratorCommunitiesCommunityIdModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_user_id: true },
    });
  const modType = typia.assert<"admin" | "moderator">(props.moderator.type);
  if (modType !== "admin" && props.moderator.id !== community.owner_user_id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.moderatorId === community.owner_user_id) {
    throw new HttpException("Cannot remove community owner as moderator", 403);
  }
  await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
    {
      where: {
        community_id_community_moderator_id: {
          community_id: props.communityId,
          community_moderator_id: props.moderatorId,
        },
      },
    },
  );
  await MyGlobal.prisma.community_platform_community_moderators.delete({
    where: {
      community_id_community_moderator_id: {
        community_id: props.communityId,
        community_moderator_id: props.moderatorId,
      },
    },
  });
}
