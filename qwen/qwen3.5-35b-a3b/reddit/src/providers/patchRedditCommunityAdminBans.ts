import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanRecord";
import { IRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanRecord";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityBanRecordAtSummaryTransformer } from "../transformers/RedditCommunityBanRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminBans(props: {
  admin: AdminPayload;
  body: IRedditCommunityBanRecord.IRequest;
}): Promise<IPageIRedditCommunityBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_community_ban_recordsWhereInput = {
    deleted_at: null,
    ...(props.body.community_id !== undefined && {
      community_id: props.body.community_id,
    }),
    ...(props.body.user_id !== undefined && {
      user_id: props.body.user_id,
    }),
    ...(props.body.ban_status !== undefined &&
      props.body.ban_status === "active" && { unban_at: null }),
    ...(props.body.ban_status !== undefined &&
      props.body.ban_status === "unbanned" && { unban_at: { not: null } }),
    ...(props.body.banned_at_from !== undefined && {
      banned_at: { gte: props.body.banned_at_from },
    }),
    ...(props.body.banned_at_to !== undefined && {
      banned_at: { lte: props.body.banned_at_to },
    }),
    ...(props.body.unban_at_from !== undefined && {
      unban_at: { gte: props.body.unban_at_from },
    }),
    ...(props.body.unban_at_to !== undefined && {
      unban_at: { lte: props.body.unban_at_to },
    }),
  } satisfies Prisma.reddit_community_ban_recordsWhereInput;
  const orderByInput =
    props.body.order_by === "user_id"
      ? { user_id: "asc" as const }
      : { banned_at: "desc" as const };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_ban_records.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityBanRecordAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_ban_records.count({
      where,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityBanRecordAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityBanRecord.ISummary;
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
// import { IRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanRecord";
// import { IPageIRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanRecord";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityAdminBans(props: {
//   admin: AdminPayload;
//   body: IRedditCommunityBanRecord.IRequest;
// }): Promise<IPageIRedditCommunityBanRecord.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_ban_records.findMany({
//     ...RedditCommunityBanRecordAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityBanRecordAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------