import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommentSnapshot";
import { IRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommentSnapshotAtSummaryTransformer } from "../transformers/RedditPlatformCommentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommentSnapshots(props: {
  body: IRedditPlatformCommentSnapshot.IRequest;
}): Promise<IPageIRedditPlatformCommentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate limit range
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  // Build where clause
  const whereInput: Prisma.reddit_platform_comment_snapshotsWhereInput = {
    reddit_platform_comment_id: props.body.reddit_platform_comment_id,
    post_id: props.body.post_id,
    ...(props.body.startDate && {
      snapshot_created_at: { gte: props.body.startDate },
    }),
    ...(props.body.endDate && {
      snapshot_created_at: { lte: props.body.endDate },
    }),
  };
  // Build orderBy
  const orderByInput = (
    props.body.sort === "comment_created_at"
      ? { comment_created_at: "asc" as const }
      : props.body.sort === "score"
        ? { score: "asc" as const }
        : { snapshot_created_at: "desc" as const }
  ) satisfies Prisma.reddit_platform_comment_snapshotsOrderByWithRelationInput;
  // Query data
  const records =
    await MyGlobal.prisma.reddit_platform_comment_snapshots.findMany({
      ...RedditPlatformCommentSnapshotAtSummaryTransformer.select(),
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
    });
  // Query total count
  const total = await MyGlobal.prisma.reddit_platform_comment_snapshots.count({
    where: whereInput,
  });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformCommentSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || (total === 0 ? 0 : 1),
    } satisfies IPage.IPagination,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentSnapshot";
// import { IPageIRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommentSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformCommentSnapshots(props: {
//   body: IRedditPlatformCommentSnapshot.IRequest;
// }): Promise<IPageIRedditPlatformCommentSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_comment_snapshots.findMany({
//     ...RedditPlatformCommentSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformCommentSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------