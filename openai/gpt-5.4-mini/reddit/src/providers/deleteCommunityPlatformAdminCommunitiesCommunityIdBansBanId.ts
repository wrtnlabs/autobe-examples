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

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_moderation_roles.findFirstOrThrow({
    where: {
      community_platform_community_id: props.communityId,
      community_platform_member_id: props.admin.id,
      deleted_at: null,
      role_type: { in: ["owner", "moderator"] },
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.community_platform_bans.findFirstOrThrow({
    where: {
      id: props.banId,
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.community_platform_bans.update({
    where: {
      id: props.banId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
