import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecordSnapshot";
import { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformBanRecordSnapshotAtSummaryTransformer } from "../transformers/RedditPlatformBanRecordSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberBanSnapshots(props: {
  member: MemberPayload;
  body: IRedditPlatformBanRecordSnapshot.IRequest;
}): Promise<IPageIRedditPlatformBanRecordSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be >= 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip: number = (page - 1) * limit;
  const bannedAtStart: (string & tags.Format<"date-time">) | undefined =
    props.body.banned_at_start;
  const bannedAtEnd: (string & tags.Format<"date-time">) | undefined =
    props.body.banned_at_end;
  if (bannedAtStart !== undefined && bannedAtEnd !== undefined) {
    const start: string & tags.Format<"date-time"> = bannedAtStart;
    const end: string & tags.Format<"date-time"> = bannedAtEnd;
    if (start > end) {
      throw new HttpException("banned_at_start must be <= banned_at_end", 400);
    }
  }
  const unbannedAtStart: (string & tags.Format<"date-time">) | undefined =
    props.body.unbanned_at_start;
  const unbannedAtEnd: (string & tags.Format<"date-time">) | undefined =
    props.body.unbanned_at_end;
  if (unbannedAtStart !== undefined && unbannedAtEnd !== undefined) {
    const start: string & tags.Format<"date-time"> = unbannedAtStart;
    const end: string & tags.Format<"date-time"> = unbannedAtEnd;
    if (start > end) {
      throw new HttpException(
        "unbanned_at_start must be <= unbanned_at_end",
        400,
      );
    }
  }
  const whereInput: Prisma.reddit_platform_ban_record_snapshotsWhereInput = {
    ...(props.body.reddit_platform_user_id !== undefined && {
      reddit_platform_user_id: props.body.reddit_platform_user_id,
    }),
    ...(props.body.reddit_platform_community_id !== undefined && {
      reddit_platform_community_id: props.body.reddit_platform_community_id,
    }),
    ...(props.body.reddit_platform_ban_record_id !== undefined && {
      reddit_platform_ban_record_id: props.body.reddit_platform_ban_record_id,
    }),
    ...(bannedAtStart !== undefined && {
      banned_at: { gte: bannedAtStart },
    }),
    ...(bannedAtEnd !== undefined && {
      banned_at: { lte: bannedAtEnd },
    }),
    ...(unbannedAtStart !== undefined && {
      unbanned_at: { gte: unbannedAtStart },
    }),
    ...(unbannedAtEnd !== undefined && {
      unbanned_at: { lte: unbannedAtEnd },
    }),
    ...(props.body.has_unban !== undefined && {
      unbanned_at:
        props.body.has_unban === true ? { not: null } : { equals: null },
    }),
  } satisfies Prisma.reddit_platform_ban_record_snapshotsWhereInput;
  const sortByName: "snapshot_created_at" | "banned_at" | "unbanned_at" =
    props.body.sort_by ?? "snapshot_created_at";
  const sortOrder: "asc" | "desc" = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.reddit_platform_ban_record_snapshotsOrderByWithRelationInput[] =
    [
      sortByName === "banned_at"
        ? { banned_at: sortOrder }
        : sortByName === "unbanned_at"
          ? { unbanned_at: sortOrder }
          : { snapshot_created_at: sortOrder },
    ] satisfies Prisma.reddit_platform_ban_record_snapshotsOrderByWithRelationInput[];
  const records: Array<RedditPlatformBanRecordSnapshotAtSummaryTransformer.Payload> =
    await MyGlobal.prisma.reddit_platform_ban_record_snapshots.findMany({
      ...RedditPlatformBanRecordSnapshotAtSummaryTransformer.select(),
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: orderByInput,
    });
  const total: number =
    await MyGlobal.prisma.reddit_platform_ban_record_snapshots.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditPlatformBanRecordSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformBanRecordSnapshot.ISummary;
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
// import { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
// import { IPageIRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecordSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberBanSnapshots(props: {
//   member: MemberPayload;
//   body: IRedditPlatformBanRecordSnapshot.IRequest;
// }): Promise<IPageIRedditPlatformBanRecordSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_ban_record_snapshots.findMany({
//     ...RedditPlatformBanRecordSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformBanRecordSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------