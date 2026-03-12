import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostSnapshotAtSummaryTransformer } from "../transformers/RedditClonePostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditClonePostSnapshots(props: {
  body: IRedditClonePostSnapshot.IRequest;
}): Promise<IPageIRedditClonePostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_post_snapshotsWhereInput = {};
  if (props.body.post_id !== undefined) {
    whereInput.reddit_clone_post_id = props.body.post_id;
  }
  if (
    props.body.captured_at_from !== undefined ||
    props.body.captured_at_to !== undefined
  ) {
    whereInput.captured_at = {};
    if (props.body.captured_at_from !== undefined) {
      whereInput.captured_at.gte = new Date(props.body.captured_at_from);
    }
    if (props.body.captured_at_to !== undefined) {
      whereInput.captured_at.lte = new Date(props.body.captured_at_to);
    }
  }
  if (props.body.post_type !== undefined) {
    whereInput.post_type = props.body.post_type;
  }
  const sortDirection: "asc" | "desc" =
    props.body.sort_direction === "asc" ? "asc" : "desc";
  const data = await MyGlobal.prisma.reddit_clone_post_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { captured_at: sortDirection },
    ...RedditClonePostSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_post_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditClonePostSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditClonePostSnapshot.ISummary;
}
