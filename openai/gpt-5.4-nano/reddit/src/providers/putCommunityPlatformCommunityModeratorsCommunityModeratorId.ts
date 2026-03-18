import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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

export async function putCommunityPlatformCommunityModeratorsCommunityModeratorId(props: {
  communityModeratorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IUpdate;
}): Promise<ICommunityPlatformCommunityModerator> {
  const now = new Date();
  const target =
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
  // TODO: authorization and eligibility checks
  // TODO: apply update
  const updated =
    await MyGlobal.prisma.community_platform_community_moderators.update({
      where: { id: props.communityModeratorId },
      data: {
        ...(props.body.community_id !== undefined && {
          community_id: props.body.community_id,
        }),
        ...(props.body.moderator_user_id !== undefined && {
          moderator_user_id: props.body.moderator_user_id,
        }),
        ...(props.body.deleted_at !== undefined && {
          deleted_at: props.body.deleted_at,
        }),
        updated_at: now,
      },
      select: {
        id: true,
        community_id: true,
        moderator_user_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: updated.id,
    community_id: updated.community_id,
    moderator_user_id: updated.moderator_user_id,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  };
}
