import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySnapshot";
import { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunitySnapshotAtSummaryTransformer } from "../transformers/RedditPlatformCommunitySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunitiesNameSnapshots(props: {
  name: string;
  body: IRedditPlatformCommunitySnapshot.IRequest;
}): Promise<IPageIRedditPlatformCommunitySnapshot.ISummary> {
  // Verify community exists
  await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
    where: { name: props.name },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  // Build where filter
  const whereInput: Prisma.reddit_platform_community_snapshotsWhereInput = {
    community: {
      name: props.name,
    },
    ...(props.body.createdAfter !== undefined && {
      created_at: { gte: props.body.createdAfter },
    }),
    ...(props.body.createdBefore !== undefined && {
      created_at: { lte: props.body.createdBefore },
    }),
  };
  // Build order by
  const orderByInput: Prisma.reddit_platform_community_snapshotsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" as const }
      : props.body.direction === "asc"
        ? { created_at: "asc" as const }
        : { created_at: "desc" as const };
  // Get data and count
  const data =
    await MyGlobal.prisma.reddit_platform_community_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformCommunitySnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_platform_community_snapshots.count(
    {
      where: whereInput,
    },
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.max(0, Math.ceil(total / limit)),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformCommunitySnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformCommunitySnapshot.ISummary;
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
// import { IRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySnapshot";
// import { IPageIRedditPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformCommunitiesNameSnapshots(props: {
//   name: string;
//   body: IRedditPlatformCommunitySnapshot.IRequest;
// }): Promise<IPageIRedditPlatformCommunitySnapshot.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_community_snapshots.findMany({
//     ...RedditPlatformCommunitySnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformCommunitySnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------