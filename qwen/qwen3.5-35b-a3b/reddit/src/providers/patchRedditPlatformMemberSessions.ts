import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberSessionAtSummaryTransformer } from "../transformers/RedditPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberSessions(props: {
  member: MemberPayload;
  body: IRedditPlatformMemberSession.IRequest;
}): Promise<IPageIRedditPlatformMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput: Prisma.reddit_platform_member_sessionsWhereInput = {
    reddit_platform_member_id: props.member.id,
    deleted_at: null,
  };
  // Apply status filter
  if (props.body.status) {
    switch (props.body.status) {
      case "active":
        whereInput.revoked_at = null;
        whereInput.expired_at = { gt: now };
        break;
      case "expired":
        whereInput.revoked_at = null;
        whereInput.expired_at = { lte: now };
        break;
      case "revoked":
        whereInput.revoked_at = { not: null };
        break;
    }
  }
  // Apply date_range filter
  if (props.body.date_range) {
    whereInput.created_at = {
      gte: new Date(props.body.date_range.start_date),
      lte: new Date(props.body.date_range.end_date),
    };
  }
  // Apply sorting
  const orderByInput =
    ((): Prisma.reddit_platform_member_sessionsOrderByWithRelationInput => {
      const field = props.body.sort_by ?? "created_at";
      const order = (props.body.sort_order as Prisma.SortOrder) ?? "desc";
      return { [field]: order };
    })();
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_member_sessions.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditPlatformMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_member_sessions.count({
      where: whereInput,
    }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditPlatformMemberSessionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformMemberSession.ISummary;
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
// import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
// import { IPageIRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMemberSessions(props: {
//   member: MemberPayload;
//   body: IRedditPlatformMemberSession.IRequest;
// }): Promise<IPageIRedditPlatformMemberSession.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_member_sessions.findMany({
//     ...RedditPlatformMemberSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformMemberSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------