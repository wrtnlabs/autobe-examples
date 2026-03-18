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

export async function putCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId(props: {
  member: MemberPayload;
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
          deleted_at: true,
          community: {
            select: {
              id: true,
              owner_id: true,
            },
          },
        },
      },
    );
  if (current.community_platform_community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  if (current.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
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
  if (actorRole.role_type !== "owner" && actorRole.role_type !== "moderator") {
    throw new HttpException("Forbidden", 403);
  }
  const nextRoleType = props.body.role_type ?? current.role_type;
  if (nextRoleType !== "owner" && nextRoleType !== "moderator") {
    throw new HttpException("Invalid moderation role type", 400);
  }
  if (
    current.community.owner_id === current.community_platform_member_id &&
    nextRoleType !== "owner"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    actorRole.role_type !== "owner" &&
    current.community_platform_member_id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_moderation_roles.update({
    where: { id: current.id },
    data: {
      role_type: nextRoleType,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.community_platform_moderation_roles.findUniqueOrThrow(
      {
        where: { id: current.id },
        ...CommunityPlatformModerationRoleTransformer.select(),
      },
    );
  return CommunityPlatformModerationRoleTransformer.transform(updated);
}
