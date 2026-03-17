import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformCommunityModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSnapshot";
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
import { CommunityPlatformCommunityModeratorSnapshotTransformer } from "../transformers/CommunityPlatformCommunityModeratorSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModeratorSnapshot> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const community =
      await prisma.community_platform_communities.findFirstOrThrow({
        where: {
          id: props.communityId,
          deleted_at: null,
        },
        select: {
          id: true,
          community_platform_member_id: true,
        },
      });
    const moderator =
      await prisma.community_platform_community_moderators.findFirstOrThrow({
        where: {
          id: props.moderatorId,
          deleted_at: null,
        },
        select: {
          id: true,
          community_platform_community_id: true,
        },
      });
    if (moderator.community_platform_community_id !== props.communityId) {
      throw new HttpException("Community moderator assignment not found", 404);
    }
    const actorModerator =
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
        },
      });
    if (
      community.community_platform_member_id !== props.member.id &&
      actorModerator === null
    ) {
      throw new HttpException("Forbidden", 403);
    }
    const snapshot =
      await prisma.community_platform_community_moderator_snapshots.create({
        data: {
          id: v4(),
          communityModerator: {
            connect: {
              id: props.moderatorId,
            },
          },
          created_at: new Date(),
        },
        ...CommunityPlatformCommunityModeratorSnapshotTransformer.select(),
      });
    return await CommunityPlatformCommunityModeratorSnapshotTransformer.transform(
      snapshot,
    );
  });
}
