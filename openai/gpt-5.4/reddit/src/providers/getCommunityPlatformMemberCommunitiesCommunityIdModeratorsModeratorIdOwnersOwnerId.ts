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

export async function getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdOwnersOwnerId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  ownerId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModeratorOwner> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        community_platform_member_id: true,
      },
    });
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
      {
        where: {
          id: props.moderatorId,
          community_platform_community_id: community.id,
        },
        select: {
          id: true,
          community_platform_community_id: true,
          status: true,
          revoked_at: true,
          deleted_at: true,
        },
      },
    );
  const callerModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: community.id,
        community_platform_member_id: props.member.id,
        status: "active",
        revoked_at: null,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (
    community.community_platform_member_id !== props.member.id &&
    callerModerator === null
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    moderator.status !== "active" ||
    moderator.revoked_at !== null ||
    moderator.deleted_at !== null
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const owner =
    await MyGlobal.prisma.community_platform_community_moderator_owners.findFirstOrThrow(
      {
        where: {
          id: props.ownerId,
          community_platform_community_moderator_id: moderator.id,
        },
        ...CommunityPlatformCommunityModeratorOwnerTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityModeratorOwnerTransformer.transform(
    owner,
  );
}
