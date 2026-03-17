import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformBanSnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformBanSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunityIdBansBanIdSnapshots(props: {
  admin: AdminPayload;
  communityId: string;
  banId: string;
  body: ICommunityPlatformBanSnapshot.IRequest;
}): Promise<IPageICommunityPlatformBanSnapshot.ISummary> {
  // Verify the ban exists and belongs to the specified community
  const ban = await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
      community_id: props.communityId,
    },
    select: { id: true },
  });
  // Build where clause
  const whereInput = {
    community_platform_ban_id: props.banId,
    ...(props.body.search && {
      snapshot_reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.snapshot_banned_at_from &&
      props.body.snapshot_banned_at_from !== null && {
        snapshot_banned_at: {
          gte: new Date(toISOStringSafe(props.body.snapshot_banned_at_from)),
        },
      }),
    ...(props.body.snapshot_banned_at_to &&
      props.body.snapshot_banned_at_to !== null && {
        snapshot_banned_at: {
          lte: new Date(toISOStringSafe(props.body.snapshot_banned_at_to)),
        },
      }),
    ...(props.body.snapshot_expires_at_from !== undefined &&
      props.body.snapshot_expires_at_from !== null && {
        OR: [
          { snapshot_expires_at: null },
          {
            snapshot_expires_at: {
              gte: new Date(
                toISOStringSafe(props.body.snapshot_expires_at_from),
              ),
            },
          },
        ],
      }),
    ...(props.body.snapshot_expires_at_to !== undefined &&
      props.body.snapshot_expires_at_to !== null && {
        OR: [
          { snapshot_expires_at: null },
          {
            snapshot_expires_at: {
              lte: new Date(toISOStringSafe(props.body.snapshot_expires_at_to)),
            },
          },
        ],
      }),
    ...(props.body.snapshot_unbanned_at_from !== undefined &&
      props.body.snapshot_unbanned_at_from !== null && {
        OR: [
          { snapshot_unbanned_at: null },
          {
            snapshot_unbanned_at: {
              gte: new Date(
                toISOStringSafe(props.body.snapshot_unbanned_at_from),
              ),
            },
          },
        ],
      }),
    ...(props.body.snapshot_unbanned_at_to !== undefined &&
      props.body.snapshot_unbanned_at_to !== null && {
        OR: [
          { snapshot_unbanned_at: null },
          {
            snapshot_unbanned_at: {
              lte: new Date(
                toISOStringSafe(props.body.snapshot_unbanned_at_to),
              ),
            },
          },
        ],
      }),
    ...(props.body.snapshot_active !== undefined && {
      snapshot_active:
        props.body.snapshot_active !== null
          ? props.body.snapshot_active
          : false,
    }),
    deleted_at: null,
  } satisfies Prisma.community_platform_ban_snapshotsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Fetch data with transformer select
  const data = await MyGlobal.prisma.community_platform_ban_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...CommunityPlatformBanSnapshotAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.community_platform_ban_snapshots.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformBanSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
