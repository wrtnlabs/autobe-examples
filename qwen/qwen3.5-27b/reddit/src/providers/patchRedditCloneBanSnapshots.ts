import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBanSnapshot";
import { IRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneBanSnapshotAtSummaryTransformer } from "../transformers/RedditCloneBanSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneBanSnapshots(props: {
  body: IRedditCloneBanSnapshot.IRequest;
}): Promise<IPageIRedditCloneBanSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.ban_id !== undefined && { ban_id: props.body.ban_id }),
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.banned_by_id !== undefined && {
      banned_by_id: props.body.banned_by_id,
    }),
    ...(props.body.banned_at_from !== undefined && {
      banned_at: { gte: new Date(props.body.banned_at_from) },
    }),
    ...(props.body.banned_at_to !== undefined && {
      banned_at: { lte: new Date(props.body.banned_at_to) },
    }),
    ...(props.body.lifted_at_from !== undefined && {
      lifted_at: { gte: new Date(props.body.lifted_at_from) },
    }),
    ...(props.body.lifted_at_to !== undefined && {
      lifted_at: { lte: new Date(props.body.lifted_at_to) },
    }),
  } satisfies Prisma.reddit_clone_ban_snapshotsWhereInput;
  const orderByInput = (() => {
    const sortField = props.body.sort ?? "created_at";
    const sortOrder = props.body.order ?? "desc";
    const validSortFields = [
      "created_at",
      "banned_at",
      "lifted_at",
      "id",
    ] as const;
    if (!validSortFields.includes(sortField as any)) {
      throw new HttpException("Invalid sort field", 400);
    }
    return {
      [sortField]: sortOrder,
    } satisfies Prisma.reddit_clone_ban_snapshotsOrderByWithRelationInput;
  })();
  const data = await MyGlobal.prisma.reddit_clone_ban_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneBanSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_ban_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneBanSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
