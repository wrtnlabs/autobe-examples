import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostSnapshotAtSummaryTransformer } from "../transformers/CommunityPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPostSnapshots(props: {
  body: ICommunityPostSnapshot.IRequest;
}): Promise<IPageICommunityPostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range filter
  const dateRangeFilter =
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          ...(props.body.created_at_from !== undefined && {
            gte: new Date(props.body.created_at_from),
          }),
          ...(props.body.created_at_to !== undefined && {
            lte: new Date(props.body.created_at_to),
          }),
        }
      : undefined;
  const whereInput = {
    ...(props.body.community_post_id !== undefined && {
      community_post_id: props.body.community_post_id,
    }),
    ...(props.body.author_id !== undefined && {
      author_id: props.body.author_id,
    }),
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.snapshot_reason !== undefined && {
      snapshot_reason: props.body.snapshot_reason,
    }),
    ...(props.body.search !== undefined && {
      title: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(dateRangeFilter !== undefined && { created_at: dateRangeFilter }),
  } satisfies Prisma.community_post_snapshotsWhereInput;
  const sortColumn =
    props.body.sort_by === "vote_score"
      ? "vote_score"
      : props.body.sort_by === "hot_score"
        ? "hot_score"
        : props.body.sort_by === "controversy_score"
          ? "controversy_score"
          : "created_at";
  const sortDirection = props.body.sort_direction === "asc" ? "asc" : "desc";
  const orderByInput = {
    [sortColumn]: sortDirection,
  } satisfies Prisma.community_post_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.community_post_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPostSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_post_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPostSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
