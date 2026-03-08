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

export async function deleteCommunityPlatformMemberCommunitiesCommunityNameBansBanId(props: {
  member: MemberPayload;
  communityName: string;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Resolve community by name
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: { id: true, owner_id: true },
    });
  // 2. Check authorization - owner or active moderator
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    const moderatorRecord =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: community.id,
          member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (moderatorRecord === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Verify ban exists in the community
  const ban = await MyGlobal.prisma.community_platform_community_bans.findFirst(
    {
      where: {
        id: props.banId,
        community_id: community.id,
        deleted_at: null,
      },
    },
  );
  if (ban === null) {
    throw new HttpException("Ban not found", 404);
  }
  // 4. Perform soft-delete (unban)
  await MyGlobal.prisma.community_platform_community_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
