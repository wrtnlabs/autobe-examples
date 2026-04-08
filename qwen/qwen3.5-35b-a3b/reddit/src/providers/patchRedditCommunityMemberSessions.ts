import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityMemberSessionAtSummaryTransformer } from "../transformers/RedditCommunityMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberSessions(props: {
  member: MemberPayload;
  body: IRedditCommunityMemberSession.IRequest;
}): Promise<IPageIRedditCommunityMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = props.body.sortField ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const statusFilter = props.body.status;
  let whereConditions: Prisma.reddit_community_member_sessionsWhereInput = {};
  if (statusFilter === "active") {
    whereConditions = {
      deleted_at: null,
      expired_at: { gt: new Date() },
    };
  } else if (statusFilter === "expired") {
    whereConditions = {
      expired_at: { lte: new Date() },
    };
  } else if (statusFilter === "revoked") {
    whereConditions = {
      deleted_at: { not: null },
    };
  } else {
    whereConditions = { deleted_at: null };
  }
  if (props.body.memberId !== undefined) {
    whereConditions = {
      ...whereConditions,
      reddit_community_member_id: props.body.memberId,
    };
  }
  if (props.body.ipAddress !== undefined) {
    whereConditions = {
      ...whereConditions,
      ip: { contains: props.body.ipAddress },
    };
  }
  if (props.body.createdAfter !== undefined) {
    whereConditions = {
      ...whereConditions,
      created_at: { gte: new Date(props.body.createdAfter) },
    };
  }
  if (props.body.createdBefore !== undefined) {
    whereConditions = {
      ...whereConditions,
      created_at: { lte: new Date(props.body.createdBefore) },
    };
  }
  if (props.body.expiredAfter !== undefined) {
    whereConditions = {
      ...whereConditions,
      expired_at: { gte: new Date(props.body.expiredAfter) },
    };
  }
  if (props.body.expiredBefore !== undefined) {
    whereConditions = {
      ...whereConditions,
      expired_at: { lte: new Date(props.body.expiredBefore) },
    };
  }
  const orderByInput: Prisma.reddit_community_member_sessionsOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    } satisfies Prisma.reddit_community_member_sessionsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_member_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_member_sessions.count({
      where: whereConditions,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityMemberSessionAtSummaryTransformer.transform,
    ),
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
// import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
// import { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityMemberSessions(props: {
//   member: MemberPayload;
//   body: IRedditCommunityMemberSession.IRequest;
// }): Promise<IPageIRedditCommunityMemberSession.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_member_sessions.findMany({
//     ...RedditCommunityMemberSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityMemberSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------