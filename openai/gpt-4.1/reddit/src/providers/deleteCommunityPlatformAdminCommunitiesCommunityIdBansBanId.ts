import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the ban – must match both id and communityId
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        id: props.banId,
        community_platform_community_id: props.communityId,
      },
    },
  );
  if (!ban) {
    throw new HttpException(
      "Ban record not found for specified community.",
      404,
    );
  }

  // Hard delete the ban
  await MyGlobal.prisma.community_platform_community_bans.delete({
    where: { id: props.banId },
  });

  // Audit log for permanent erase
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      action: "ban_delete",
      target_type: "community_ban",
      target_id: props.banId,
      metadata: JSON.stringify({ communityId: props.communityId }),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // No return value
}
