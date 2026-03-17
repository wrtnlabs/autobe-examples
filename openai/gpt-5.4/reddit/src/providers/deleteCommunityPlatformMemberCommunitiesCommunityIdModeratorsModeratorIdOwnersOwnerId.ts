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

export async function deleteCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdOwnersOwnerId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  ownerId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true },
    });
    const moderator =
      await prisma.community_platform_community_moderators.findUniqueOrThrow({
        where: { id: props.moderatorId },
        select: {
          id: true,
          community_platform_community_id: true,
        },
      });
    if (moderator.community_platform_community_id !== props.communityId) {
      throw new HttpException("Not Found", 404);
    }
    const owner =
      await prisma.community_platform_community_moderator_owners.findUniqueOrThrow(
        {
          where: { id: props.ownerId },
          select: {
            id: true,
            community_platform_community_moderator_id: true,
          },
        },
      );
    if (owner.community_platform_community_moderator_id !== props.moderatorId) {
      throw new HttpException("Not Found", 404);
    }
    const actingOwner =
      await prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          community_platform_member_id: props.member.id,
          status: "active",
          revoked_at: null,
          deleted_at: null,
        },
        select: {
          id: true,
          owner: {
            select: {
              id: true,
            },
          },
        },
      });
    if (actingOwner === null || actingOwner.owner === null) {
      throw new HttpException("Forbidden", 403);
    }
    await prisma.community_platform_community_moderator_owners.delete({
      where: { id: props.ownerId },
    });
  });
}
