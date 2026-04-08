import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecord";
import { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
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
import { RedditPlatformBanRecordAtSummaryTransformer } from "../transformers/RedditPlatformBanRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberBans(props: {
  member: MemberPayload;
  body: IRedditPlatformBanRecord.IRequest;
}): Promise<IPageIRedditPlatformBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.reddit_platform_ban_recordsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.user_id !== undefined && { user_id: props.body.user_id }),
    ...(props.body.banned_by !== undefined && {
      banned_by: props.body.banned_by,
    }),
    ...(props.body.banned_at_from !== undefined && {
      banned_at: { gte: props.body.banned_at_from },
    }),
    ...(props.body.banned_at_to !== undefined && {
      banned_at: { lte: props.body.banned_at_to },
    }),
    ...(props.body.search_query !== undefined && {
      reason: { contains: props.body.search_query, mode: "insensitive" },
    }),
  };
  const statusWhere: Prisma.reddit_platform_ban_recordsWhereInput | undefined =
    props.body.status === "active"
      ? { unbanned_at: null }
      : props.body.status === "expired"
        ? { unbanned_at: { not: null } }
        : undefined;
  const unbannedAtRangeWhere:
    | Prisma.reddit_platform_ban_recordsWhereInput
    | undefined =
    props.body.unbanned_at_from !== undefined ||
    props.body.unbanned_at_to !== undefined
      ? {
          unbanned_at: {
            ...(props.body.unbanned_at_from !== undefined && {
              gte: props.body.unbanned_at_from,
            }),
            ...(props.body.unbanned_at_to !== undefined && {
              lte: props.body.unbanned_at_to,
            }),
          },
        }
      : undefined;
  const whereInput: Prisma.reddit_platform_ban_recordsWhereInput = {
    ...baseWhere,
    ...(statusWhere !== undefined && { AND: [statusWhere] }),
    ...(unbannedAtRangeWhere !== undefined && { AND: [unbannedAtRangeWhere] }),
  };
  const sortOrder: "asc" | "desc" = props.body.order ?? "desc";
  const orderByInput: Prisma.reddit_platform_ban_recordsOrderByWithRelationInput[] =
    [
      {
        ...(props.body.sort === "banned_at" && { banned_at: sortOrder }),
        ...(props.body.sort === "reason" && { reason: sortOrder }),
        ...(props.body.sort === "user_id" && { user_id: sortOrder }),
      },
    ];
  const total = await MyGlobal.prisma.reddit_platform_ban_records.count({
    where: whereInput,
  });
  const records = await MyGlobal.prisma.reddit_platform_ban_records.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformBanRecordAtSummaryTransformer.select(),
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditPlatformBanRecordAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditPlatformBanRecord.ISummary;
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
// import { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
// import { IPageIRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecord";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberBans(props: {
//   member: MemberPayload;
//   body: IRedditPlatformBanRecord.IRequest;
// }): Promise<IPageIRedditPlatformBanRecord.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_ban_records.findMany({
//     ...RedditPlatformBanRecordAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformBanRecordAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------