import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformCommunityModeratorOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorOwner";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityModeratorOwnerTransformer } from "../transformers/CommunityPlatformCommunityModeratorOwnerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdOwnersOwnerId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  ownerId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorOwner.IUpdate;
}): Promise<ICommunityPlatformCommunityModeratorOwner> {
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const community =
      await prisma.community_platform_communities.findUniqueOrThrow({
        where: { id: props.communityId },
        select: {
          id: true,
          community_platform_member_id: true,
          deleted_at: true,
        },
      });
    if (community.deleted_at !== null) {
      throw new HttpException("Community not available", 409);
    }
    if (community.community_platform_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    const moderator =
      await prisma.community_platform_community_moderators.findUniqueOrThrow({
        where: { id: props.moderatorId },
        select: {
          id: true,
          community_platform_community_id: true,
          role: true,
          status: true,
          revoked_at: true,
          deleted_at: true,
        },
      });
    if (moderator.community_platform_community_id !== props.communityId) {
      throw new HttpException(
        "Moderator assignment does not belong to the specified community",
        409,
      );
    }
    if (moderator.deleted_at !== null) {
      throw new HttpException("Moderator assignment not available", 409);
    }
    if (moderator.revoked_at !== null || moderator.status !== "active") {
      throw new HttpException("Moderator assignment is not active", 409);
    }
    if (moderator.role !== "owner") {
      throw new HttpException(
        "Moderator assignment is not owner-classified",
        409,
      );
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
      throw new HttpException(
        "Owner record does not belong to the specified moderator assignment",
        409,
      );
    }
    const updatedAt = toISOStringSafe(new Date().toISOString());
    await prisma.community_platform_community_moderator_owners.update({
      where: { id: props.ownerId },
      data: {
        updated_at: updatedAt,
      },
    });
    return await prisma.community_platform_community_moderator_owners.findUniqueOrThrow(
      {
        where: { id: props.ownerId },
        ...CommunityPlatformCommunityModeratorOwnerTransformer.select(),
      },
    );
  });
  return await CommunityPlatformCommunityModeratorOwnerTransformer.transform(
    updated,
  );
}
