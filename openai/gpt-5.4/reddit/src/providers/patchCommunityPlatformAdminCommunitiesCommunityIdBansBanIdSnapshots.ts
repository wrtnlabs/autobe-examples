import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBanSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityBanSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdBansBanIdSnapshots(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBanSnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunityBanSnapshot.ISummary> {
  await MyGlobal.prisma.community_platform_community_bans.findFirstOrThrow({
    where: {
      id: props.banId,
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_platform_community_ban_id: props.banId,
    ...(props.body.snapshotId !== undefined && {
      id: props.body.snapshotId,
    }),
    ...(props.body.createdByMemberId !== undefined
      ? {
          created_by_member_id: props.body.createdByMemberId,
        }
      : props.body.hasCreatedByMember === true
        ? {
            created_by_member_id: {
              not: null,
            },
          }
        : props.body.hasCreatedByMember === false
          ? {
              created_by_member_id: null,
            }
          : {}),
  } satisfies Prisma.community_platform_community_ban_snapshotsWhereInput;
  const orderByInput =
    props.body.sort === "oldest" ||
    props.body.sort === "asc" ||
    props.body.sort === "id_asc"
      ? ({
          id: "asc",
        } satisfies Prisma.community_platform_community_ban_snapshotsOrderByWithRelationInput)
      : ({
          id: "desc",
        } satisfies Prisma.community_platform_community_ban_snapshotsOrderByWithRelationInput);
  const data =
    await MyGlobal.prisma.community_platform_community_ban_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityPlatformCommunityBanSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_community_ban_snapshots.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformCommunityBanSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
