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

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const authority =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        role_type: { in: ["owner", "moderator"] },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (authority === null) {
    throw new HttpException("Forbidden", 403);
  }
  const ban = await MyGlobal.prisma.community_platform_bans.findUnique({
    where: {
      id: props.banId,
    },
    select: {
      id: true,
      community_platform_community_id: true,
      deleted_at: true,
    },
  });
  if (
    ban === null ||
    ban.community_platform_community_id !== props.communityId ||
    ban.deleted_at !== null
  ) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.community_platform_bans.delete({
    where: {
      id: props.banId,
    },
  });
}
