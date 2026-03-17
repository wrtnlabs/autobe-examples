import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformCommunityModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityModeratorSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityModeratorSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorIdSnapshots(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModeratorSnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunityModeratorSnapshot.ISummary> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const actorModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        status: "active",
        revoked_at: null,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (actorModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const targetModerator =
    await MyGlobal.prisma.community_platform_community_moderators.findUniqueOrThrow(
      {
        where: { id: props.moderatorId },
        select: { id: true, community_platform_community_id: true },
      },
    );
  if (targetModerator.community_platform_community_id !== props.communityId) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByInput =
    props.body.sort === undefined ||
    props.body.sort === "created_at_desc" ||
    props.body.sort === "newest"
      ? ({
          created_at: "desc",
        } satisfies Prisma.community_platform_community_moderator_snapshotsOrderByWithRelationInput)
      : props.body.sort === "created_at_asc" || props.body.sort === "oldest"
        ? ({
            created_at: "asc",
          } satisfies Prisma.community_platform_community_moderator_snapshotsOrderByWithRelationInput)
        : (() => {
            throw new HttpException("Unsupported sort", 400);
          })();
  const whereInput = {
    community_platform_community_moderator_id: props.moderatorId,
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_community_moderator_snapshotsWhereInput;
  const snapshots =
    await MyGlobal.prisma.community_platform_community_moderator_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...CommunityPlatformCommunityModeratorSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.community_platform_community_moderator_snapshots.count(
      {
        where: whereInput,
      },
    );
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      CommunityPlatformCommunityModeratorSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
