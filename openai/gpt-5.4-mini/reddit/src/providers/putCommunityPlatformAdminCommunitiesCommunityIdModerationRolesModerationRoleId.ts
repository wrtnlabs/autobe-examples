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

export async function putCommunityPlatformAdminCommunitiesCommunityIdModerationRolesModerationRoleId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  moderationRoleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationRole.IUpdate;
}): Promise<ICommunityPlatformModerationRole> {
  const current =
    await MyGlobal.prisma.community_platform_moderation_roles.findUniqueOrThrow(
      {
        where: { id: props.moderationRoleId },
        select: {
          id: true,
          community_platform_community_id: true,
          community_platform_member_id: true,
          role_type: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (current.community_platform_community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  if (current.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.role_type !== undefined) {
    if (
      props.body.role_type !== "owner" &&
      props.body.role_type !== "moderator"
    ) {
      throw new HttpException("Invalid moderation role type", 400);
    }
    if (current.role_type === "owner" && props.body.role_type !== "owner") {
      throw new HttpException("Cannot demote owner through this endpoint", 400);
    }
  }
  const updated =
    await MyGlobal.prisma.community_platform_moderation_roles.update({
      where: { id: props.moderationRoleId },
      data: {
        ...(props.body.role_type !== undefined && {
          role_type: props.body.role_type,
        }),
        updated_at: new Date(),
      },
      ...CommunityPlatformModerationRoleTransformer.select(),
    });
  return await CommunityPlatformModerationRoleTransformer.transform(updated);
}
