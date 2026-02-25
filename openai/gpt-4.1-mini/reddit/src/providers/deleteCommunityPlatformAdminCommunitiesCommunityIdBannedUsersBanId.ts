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

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdBannedUsersBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.admin.id,
        OR: [{ role: "owner" }, { role: "moderator" }],
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const banRecord =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
    });
  if (banRecord.community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.community_platform_community_bans.delete({
    where: { id: props.banId },
  });
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_id: props.communityId,
      moderator_id: props.admin.id,
      action: "remove_ban",
      target_type: "banned_user",
      target_id: props.banId,
      created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
