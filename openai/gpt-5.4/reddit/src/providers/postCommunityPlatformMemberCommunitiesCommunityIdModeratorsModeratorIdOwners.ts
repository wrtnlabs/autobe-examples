import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdOwners(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModerator> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        community_platform_member_id: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community is not manageable", 404);
  }
  if (community.community_platform_member_id !== props.member.id) {
    const authority =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          community_platform_member_id: props.member.id,
          status: "active",
          revoked_at: null,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (authority === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const moderator =
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
  if (moderator.community_platform_community_id !== props.communityId) {
    throw new HttpException(
      "Moderator assignment does not belong to this community",
      400,
    );
  }
  if (
    moderator.status !== "active" ||
    moderator.revoked_at !== null ||
    moderator.deleted_at !== null
  ) {
    throw new HttpException(
      "Moderator assignment is unavailable for governance updates",
      400,
    );
  }
  const now = new Date();
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const existingOwner =
      await tx.community_platform_community_moderator_owners.findFirst({
        where: {
          community_platform_community_moderator_id: props.moderatorId,
        },
        select: {
          id: true,
        },
      });
    if (existingOwner !== null) {
      throw new HttpException("Owner subtype already exists", 409);
    }
    await tx.community_platform_community_moderator_owners.create({
      data: {
        id: v4(),
        community_platform_community_moderator_id: props.moderatorId,
        created_at: now,
        updated_at: now,
      },
    });
    await tx.community_platform_community_moderators.update({
      where: { id: props.moderatorId },
      data: {
        role: "owner",
        updated_at: now,
      },
    });
    return await tx.community_platform_community_moderators.findUniqueOrThrow({
      where: { id: props.moderatorId },
      ...CommunityPlatformCommunityModeratorTransformer.select(),
    });
  });
  return await CommunityPlatformCommunityModeratorTransformer.transform(
    updated,
  );
}
