import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostSnapshotAtSummaryTransformer } from "../transformers/RedditPlatformPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformPostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPostSnapshot.IRequest;
}): Promise<IPageIRedditPlatformPostSnapshot.ISummary> {
  // Validate post exists
  await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true },
  });
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.reddit_platform_post_snapshotsWhereInput = {
    reddit_platform_post_id: props.postId,
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.reddit_platform_post_snapshotsWhereInput;
  // Build orderBy
  const orderByInput: Prisma.reddit_platform_post_snapshotsOrderByWithRelationInput =
    props.body.direction === "asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Fetch snapshots
  const snapshots =
    await MyGlobal.prisma.reddit_platform_post_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditPlatformPostSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.reddit_platform_post_snapshots.count({
    where: whereInput,
  });
  // Transform and return
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      snapshots,
      RedditPlatformPostSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformPostSnapshot.ISummary;
}
