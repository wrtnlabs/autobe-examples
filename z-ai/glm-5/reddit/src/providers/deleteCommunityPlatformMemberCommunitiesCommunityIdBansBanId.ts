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
  // 1. Verify the requesting member has moderator privileges
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirstOrThrow({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
        role: { in: ["owner", "moderator"] },
      },
    });
  // 2. Find the ban record
  const ban = await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
    where: { id: props.banId },
    select: {
      id: true,
      community_id: true,
      deleted_at: true,
    },
  });
  // 3. Validate ban belongs to the specified community
  if (ban.community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to this community", 403);
  }
  // 4. Validate ban is still active (not already unbanned)
  if (ban.deleted_at !== null) {
    throw new HttpException("Ban has already been removed", 400);
  }
  // 5. Soft-delete the ban record
  await MyGlobal.prisma.community_platform_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: new Date(),
    },
  });
}
