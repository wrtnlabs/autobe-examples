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

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdModerationRolesModerationRoleId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderationRoleId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_moderation_roles.findFirstOrThrow({
    where: {
      id: props.moderationRoleId,
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_community_id: true,
    },
  });
  await MyGlobal.prisma.community_platform_moderation_roles.delete({
    where: {
      id: props.moderationRoleId,
    },
  });
}
