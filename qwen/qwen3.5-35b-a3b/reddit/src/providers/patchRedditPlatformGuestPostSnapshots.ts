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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditPlatformPostSnapshotAtSummaryTransformer } from "../transformers/RedditPlatformPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformGuestPostSnapshots(props: {
  guest: GuestPayload;
  body: IRedditPlatformPostSnapshot.IRequest;
}): Promise<IPageIRedditPlatformPostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const maxLimit = 100;
  const clampedLimit = limit < 1 ? 1 : limit > maxLimit ? maxLimit : limit;
  const skip = (page - 1) * clampedLimit;
  const createdAtMin = props.body.created_at_min;
  const createdAtMax = props.body.created_at_max;
  const whereInput: Prisma.reddit_platform_post_snapshotsWhereInput = {
    ...(props.body.snapshot_type !== undefined && {
      snapshot_type: props.body.snapshot_type,
    }),
    ...(props.body.post_type !== undefined && {
      post_type: props.body.post_type,
    }),
    ...(props.body.author_id !== undefined && {
      author_id: props.body.author_id,
    }),
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.reddit_platform_post_id !== undefined && {
      reddit_platform_post_id: props.body.reddit_platform_post_id,
    }),
    ...(createdAtMin !== undefined && {
      created_at: { gte: new Date(createdAtMin) },
    }),
    ...(createdAtMax !== undefined && {
      created_at: { lte: new Date(createdAtMax) },
    }),
  } satisfies Prisma.reddit_platform_post_snapshotsWhereInput;
  const orderByInput = (() => {
    const sortBy = props.body.sortBy ?? "created_at";
    const sortOrder = props.body.sortOrder ?? "desc";
    if (sortBy === "score") {
      return { score: sortOrder };
    } else if (sortBy === "snapshot_type") {
      return { snapshot_type: sortOrder };
    }
    return { created_at: sortOrder };
  })() satisfies Prisma.reddit_platform_post_snapshotsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_platform_post_snapshots.findMany(
    {
      ...RedditPlatformPostSnapshotAtSummaryTransformer.select(),
      where: whereInput,
      skip,
      take: clampedLimit,
      orderBy: [orderByInput],
    },
  );
  const total = await MyGlobal.prisma.reddit_platform_post_snapshots.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditPlatformPostSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: clampedLimit,
      records: total,
      pages: Math.ceil(total / clampedLimit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformPostSnapshot.ISummary;
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
// export async function patchRedditPlatformGuestPostSnapshots(props: {
//   guest: GuestPayload;
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