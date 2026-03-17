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

export async function patchCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdOwners(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModeratorOwner> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null || community.status !== "active") {
    throw new HttpException(
      "Community is not available for governance actions",
      400,
    );
  }
  const targetModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
      {
        where: { id: props.moderatorId },
        select: {
          id: true,
          community_platform_community_id: true,
          status: true,
          revoked_at: true,
          deleted_at: true,
        },
      },
    );
  if (targetModerator.community_platform_community_id !== props.communityId) {
    throw new HttpException(
      "Moderator assignment does not belong to the specified community",
      400,
    );
  }
  if (
    targetModerator.status !== "active" ||
    targetModerator.revoked_at !== null ||
    targetModerator.deleted_at !== null
  ) {
    throw new HttpException(
      "Moderator assignment is not eligible for owner classification",
      400,
    );
  }
  const actorOwner =
    await MyGlobal.prisma.community_platform_community_moderator_owners.findFirst(
      {
        where: {
          communityModerator: {
            community_platform_community_id: props.communityId,
            community_platform_member_id: props.member.id,
            status: "active",
            revoked_at: null,
            deleted_at: null,
          },
        },
        select: {
          id: true,
        },
      },
    );
  if (actorOwner === null) {
    throw new HttpException("Forbidden", 403);
  }
  const existingOwner =
    await MyGlobal.prisma.community_platform_community_moderator_owners.findUnique(
      {
        where: {
          community_platform_community_moderator_id: props.moderatorId,
        },
        select: {
          id: true,
        },
      },
    );
  if (existingOwner !== null) {
    throw new HttpException(
      "Moderator assignment is already classified as owner",
      409,
    );
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const now = new Date().toISOString();
      const ownerRow =
        await tx.community_platform_community_moderator_owners.create({
          data: {
            id: v4(),
            communityModerator: {
              connect: {
                id: props.moderatorId,
              },
            },
            created_at: now,
            updated_at: now,
          },
          select: {
            id: true,
          },
        });
      await tx.community_platform_community_moderators.update({
        where: {
          id: props.moderatorId,
        },
        data: {
          role: "owner",
          updated_at: now,
        },
      });
      return ownerRow;
    });
    const owner =
      await MyGlobal.prisma.community_platform_community_moderator_owners.findUniqueOrThrow(
        {
          where: {
            id: created.id,
          },
          ...CommunityPlatformCommunityModeratorOwnerTransformer.select(),
        },
      );
    return await CommunityPlatformCommunityModeratorOwnerTransformer.transform(
      owner,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Moderator assignment is already classified as owner",
        409,
      );
    }
    throw error;
  }
}
