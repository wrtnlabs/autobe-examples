import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneMemberSessionAtSummaryTransformer } from "../transformers/RedditCloneMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberSessions(props: {
  member: MemberPayload;
  body: IRedditCloneMemberSession.IRequest;
}): Promise<IPageIRedditCloneMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause = {
    reddit_clone_member_id: props.member.id,
    ...(props.body.ip && {
      ip: {
        contains: props.body.ip,
        mode: "default" as const,
      },
    }),
    ...(props.body.status === "active" && {
      expired_at: {
        gt: new Date(),
      },
    }),
    ...(props.body.status === "expired" && {
      expired_at: {
        lte: new Date(),
      },
    }),
    ...(props.body.createdAfter && {
      created_at: {
        gte: new Date(props.body.createdAfter),
      },
    }),
    ...(props.body.createdBefore && {
      created_at: {
        lte: new Date(props.body.createdBefore),
      },
    }),
  } satisfies Prisma.reddit_clone_member_sessionsWhereInput;
  const records = await MyGlobal.prisma.reddit_clone_member_sessions.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...RedditCloneMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_member_sessions.count({
    where: whereClause,
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
      RedditCloneMemberSessionAtSummaryTransformer.transform,
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
// import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
// import { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMemberSessions(props: {
//   member: MemberPayload;
//   body: IRedditCloneMemberSession.IRequest;
// }): Promise<IPageIRedditCloneMemberSession.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_member_sessions.findMany({
//     ...RedditCloneMemberSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneMemberSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------