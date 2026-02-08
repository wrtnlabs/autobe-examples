import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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

export async function putCommunityPlatformModeratorCommunityModeratorsCommunityModeratorId(props: {
  moderator: ModeratorPayload;
  communityModeratorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IUpdate;
}): Promise<ICommunityPlatformCommunityModerator> {
  // Using explicit casts to string to fix type errors on IUpdate.role
  const role = (
    props.body as {
      role: string;
    }
  ).role as typeof props.body extends {
    role: infer R;
  }
    ? R
    : string;
  const validRoles = ["owner", "moderator"] as const;
  if (!validRoles.includes(role as any)) {
    throw new HttpException("Invalid role value", 400);
  }
  const existing =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: { id: props.communityModeratorId },
    });
  if (!existing) {
    throw new HttpException("CommunityModerator assignment not found", 404);
  }
  if (role === "owner" && role !== existing.role) {
    const ownerConflict =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: existing.community_id,
          role: "owner",
          id: { not: existing.id },
        },
      });
    if (ownerConflict) {
      throw new HttpException(
        "Another owner already exists in this community",
        400,
      );
    }
  }
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_community_moderators.update({
      where: { id: props.communityModeratorId },
      data: {
        role: role,
        updated_at: now,
      },
    });
  return {
    id: updated.id,
    community_id: updated.community_id,
    community_moderator_id: updated.community_moderator_id,
    role: updated.role,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
