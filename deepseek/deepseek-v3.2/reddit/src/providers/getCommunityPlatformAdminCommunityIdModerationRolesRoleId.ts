import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationRoleTransformer } from "../transformers/CommunityPlatformModerationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunityIdModerationRolesRoleId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationRole> {
  // Query the moderation role ensuring it belongs to specified community and is not deleted
  const role =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirstOrThrow({
      where: {
        id: props.roleId,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      ...CommunityPlatformModerationRoleTransformer.select(),
    });
  // Transform and return the role data
  return await CommunityPlatformModerationRoleTransformer.transform(role);
}
