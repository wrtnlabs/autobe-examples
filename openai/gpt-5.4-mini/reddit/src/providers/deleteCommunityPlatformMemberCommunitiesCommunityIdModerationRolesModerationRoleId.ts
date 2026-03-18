import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationRoleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const actorRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_type: true,
      },
    });
  if (actorRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const target =
      await prisma.community_platform_moderation_roles.findFirstOrThrow({
        where: {
          id: props.moderationRoleId,
          community_platform_community_id: props.communityId,
          deleted_at: null,
        },
        select: {
          id: true,
          community_platform_member_id: true,
          role_type: true,
        },
      });
    if (target.role_type === "owner" && actorRole.role_type !== "owner") {
      throw new HttpException("Forbidden", 403);
    }
    if (
      target.community_platform_member_id === props.member.id &&
      target.role_type === "owner"
    ) {
      throw new HttpException("Forbidden", 403);
    }
    await prisma.community_platform_moderation_roles.update({
      where: {
        id: target.id,
      },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
}
