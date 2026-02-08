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

export async function putCommunityPlatformAdminCommunityModeratorsCommunityModeratorId(props: {
  admin: AdminPayload;
  communityModeratorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.IUpdate;
}): Promise<ICommunityPlatformCommunityModerator> {
  const id: string & tags.Format<"uuid"> = props.communityModeratorId;
  // Cast to any to access role due to lacking type definition
  const role = (props.body as any).role as "owner" | "moderator";
  if (role !== "owner" && role !== "moderator") {
    throw new HttpException('Role must be "owner" or "moderator"', 400);
  }
  const existing =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: { id },
    });
  if (!existing) {
    throw new HttpException("Community moderator not found", 404);
  }
  if (role === "owner") {
    const ownerConflict =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: existing.community_id,
          role: "owner",
          id: { not: id },
          deleted_at: null,
        },
      });
    if (ownerConflict) {
      throw new HttpException("Only one owner allowed per community", 400);
    }
  }
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const updated =
    await MyGlobal.prisma.community_platform_community_moderators.update({
      where: { id },
      data: {
        role,
        updated_at: now,
      },
    });
  console.log(
    `Admin ${props.admin.id} updated community moderator ${id} role to ${role} at ${now}`,
  );
  return {
    id: updated.id,
    community_id: updated.community_id,
    community_moderator_id: updated.community_moderator_id,
    role: updated.role,
    created_at: toISOStringSafe(updated.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updated.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: updated.deleted_at
      ? (toISOStringSafe(updated.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
  };
}
