import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostSnapshotAtSummaryTransformer } from "../transformers/RedditPlatformPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPostSnapshots(props: {
  member: MemberPayload;
  body: IRedditPlatformPostSnapshot.IRequest;
}): Promise<IPageIRedditPlatformPostSnapshot.ISummary> {
  // Pagination setup
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ? Math.min(props.body.limit, 100) : 20;
  const skip: number = (page - 1) * limit;
  // Cursor-based pagination using base64-encoded 'created_at|id'
  const cursorCondition: Prisma.reddit_platform_post_snapshotsWhereInput = props
    .body.cursor
    ? (() => {
        try {
          const decoded: string = Buffer.from(
            props.body.cursor,
            "base64",
          ).toString("utf-8");
          const parts: string[] = decoded.split("|");
          if (parts.length === 2) {
            return {
              OR: [
                { created_at: { gt: parts[0] } },
                {
                  created_at: parts[0],
                  id: { gt: parts[1] },
                },
              ],
            };
          }
          return {};
        } catch {
          return {};
        }
      })()
    : {};
  // Build where clause with filters
  const whereCondition: Prisma.reddit_platform_post_snapshotsWhereInput = {
    ...cursorCondition,
    ...(props.body.snapshot_type !== undefined
      ? { snapshot_type: props.body.snapshot_type }
      : {}),
    ...(props.body.post_type !== undefined
      ? { post_type: props.body.post_type }
      : {}),
    ...(props.body.author_id ? { author_id: props.body.author_id } : {}),
    ...(props.body.community_id
      ? { community_id: props.body.community_id }
      : {}),
    ...(props.body.reddit_platform_post_id
      ? { reddit_platform_post_id: props.body.reddit_platform_post_id }
      : {}),
    ...(props.body.created_at_min
      ? { created_at: { gte: props.body.created_at_min } }
      : {}),
    ...(props.body.created_at_max
      ? { created_at: { lte: props.body.created_at_max } }
      : {}),
  };
  // Build order by clause
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "desc";
  const orderBy: Prisma.reddit_platform_post_snapshotsOrderByWithRelationInput[] =
    props.body.sortBy === "score"
      ? [{ score: sortOrder }]
      : props.body.sortBy === "snapshot_type"
        ? [{ snapshot_type: sortOrder }]
        : [{ created_at: sortOrder }];
  // Query database with transformer select for proper joins
  const records = await MyGlobal.prisma.reddit_platform_post_snapshots.findMany(
    {
      ...RedditPlatformPostSnapshotAtSummaryTransformer.select(),
      where: whereCondition,
      orderBy,
      skip,
      take: limit,
    },
  );
  // Get total count for pagination metadata
  const total: number =
    await MyGlobal.prisma.reddit_platform_post_snapshots.count({
      where: whereCondition,
    });
  // Transform records to response DTO
  const data: IRedditPlatformPostSnapshot.ISummary[] = await ArrayUtil.asyncMap(
    records,
    RedditPlatformPostSnapshotAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
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
// import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
// import { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberPostSnapshots(props: {
//   member: MemberPayload;
//   body: IRedditPlatformPostSnapshot.IRequest;
// }): Promise<IPageIRedditPlatformPostSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_post_snapshots.findMany({
//     ...RedditPlatformPostSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformPostSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------