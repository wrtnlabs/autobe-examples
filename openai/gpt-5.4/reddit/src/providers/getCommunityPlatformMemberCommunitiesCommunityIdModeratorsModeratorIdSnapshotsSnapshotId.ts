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

export async function getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModeratorSnapshot> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const governance =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
        OR: [
          { status: "active" },
          {
            status: "active",
            owner: {
              isNot: null,
            },
          },
        ],
      },
      select: { id: true },
    });
  if (governance === null) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.community_platform_community_moderator_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          community_platform_community_moderator_id: props.moderatorId,
          communityModerator: {
            community_platform_community_id: props.communityId,
          },
        },
        ...CommunityPlatformCommunityModeratorSnapshotTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityModeratorSnapshotTransformer.transform(
    snapshot,
  );
}
