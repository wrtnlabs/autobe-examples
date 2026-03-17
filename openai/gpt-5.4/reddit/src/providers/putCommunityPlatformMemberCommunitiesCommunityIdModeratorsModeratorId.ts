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

export async function putCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
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
      },
    });
  await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
    where: { id: props.moderatorId },
    select: { id: true },
  });
  if (community.community_platform_member_id !== props.member.id) {
    const actorModeratorAssignment =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: props.communityId,
          community_platform_member_id: props.member.id,
          status: "active",
          deleted_at: null,
          revoked_at: null,
        },
        select: { id: true },
      });
    if (actorModeratorAssignment === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const existing =
    await MyGlobal.prisma.community_platform_community_moderators.findUnique({
      where: {
        community_platform_community_id_community_platform_member_id: {
          community_platform_community_id: props.communityId,
          community_platform_member_id: props.moderatorId,
        },
      },
      ...CommunityPlatformCommunityModeratorTransformer.select(),
    });
  if (existing !== null) {
    return await CommunityPlatformCommunityModeratorTransformer.transform(
      existing,
    );
  }
  try {
    const createdId = await MyGlobal.prisma.$transaction(async (tx) => {
      const found = await tx.community_platform_community_moderators.findUnique(
        {
          where: {
            community_platform_community_id_community_platform_member_id: {
              community_platform_community_id: props.communityId,
              community_platform_member_id: props.moderatorId,
            },
          },
          select: { id: true },
        },
      );
      if (found !== null) {
        return found.id;
      }
      const now = toISOStringSafe(new Date());
      const created = await tx.community_platform_community_moderators.create({
        data: {
          id: v4(),
          community_platform_community_id: props.communityId,
          community_platform_member_id: props.moderatorId,
          community_platform_granted_by_member_id: props.member.id,
          community_platform_revoked_by_member_id: null,
          role: "moderator",
          status: "active",
          granted_at: now,
          revoked_at: null,
          revocation_reason: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
        select: { id: true },
      });
      return created.id;
    });
    const assignment =
      await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
        {
          where: { id: createdId },
          ...CommunityPlatformCommunityModeratorTransformer.select(),
        },
      );
    return await CommunityPlatformCommunityModeratorTransformer.transform(
      assignment,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const assignment =
        await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
          {
            where: {
              community_platform_community_id_community_platform_member_id: {
                community_platform_community_id: props.communityId,
                community_platform_member_id: props.moderatorId,
              },
            },
            ...CommunityPlatformCommunityModeratorTransformer.select(),
          },
        );
      return await CommunityPlatformCommunityModeratorTransformer.transform(
        assignment,
      );
    }
    throw error;
  }
}
