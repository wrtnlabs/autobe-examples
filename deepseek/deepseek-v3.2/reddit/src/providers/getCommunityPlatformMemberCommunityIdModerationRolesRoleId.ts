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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationRoleTransformer } from "../transformers/CommunityPlatformModerationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunityIdModerationRolesRoleId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationRole> {
  // Check if member has moderation role in the community
  const moderatorRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
        role_type: { in: ["owner", "moderator"] },
      },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the specific moderation role with necessary fields for validation
  const role =
    await MyGlobal.prisma.community_platform_moderation_roles.findUniqueOrThrow(
      {
        where: {
          id: props.roleId,
          deleted_at: null,
        },
        select: {
          ...CommunityPlatformModerationRoleTransformer.select().select,
          community_platform_community_id: true,
        },
      },
    );
  // Verify role belongs to the specified community
  if (role.community_platform_community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  // Transform using the transformer
  return await CommunityPlatformModerationRoleTransformer.transform(role);
}
