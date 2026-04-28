import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppMemberSessionAtSummaryTransformer } from "../transformers/TodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppSessions(props: {
  member: {
    id: string;
  };
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const conditions: Prisma.todo_app_member_sessionsWhereInput[] = [
    { todo_app_member_id: props.member.id },
  ];
  const now = toISOStringSafe(new Date());
  if (props.body.activeStatus === "active") {
    conditions.push({ expired_at: { gt: now } });
  } else if (props.body.activeStatus === "expired") {
    conditions.push({ expired_at: { lte: now } });
  }
  if (props.body.createdAtFrom !== undefined) {
    conditions.push({ created_at: { gte: props.body.createdAtFrom } });
  }
  if (props.body.createdAtTo !== undefined) {
    conditions.push({ created_at: { lte: props.body.createdAtTo } });
  }
  const where = conditions.length > 1 ? { AND: conditions } : conditions[0];
  const orderByMap: Record<
    string,
    Prisma.todo_app_member_sessionsOrderByWithRelationInput
  > = {
    "createdAt ASC": { created_at: "asc" },
    "createdAt DESC": { created_at: "desc" },
    "ipAddress ASC": { ip: "asc" as const },
    "ipAddress DESC": { ip: "desc" as const },
    "href ASC": { href: "asc" as const },
    "href DESC": { href: "desc" as const },
  };
  const orderBy = orderByMap[props.body.sortBy ?? "createdAt DESC"] ?? {
    created_at: "desc" as const,
  };
  const records = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...TodoAppMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_member_sessions.count({
    where,
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
      TodoAppMemberSessionAtSummaryTransformer.transform,
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
// import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
// import { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchTodoAppSessions(props: {
//   body: ITodoAppMemberSession.IRequest;
// }): Promise<IPageITodoAppMemberSession.ISummary> {
//   const records = await MyGlobal.prisma.todo_app_member_sessions.findMany({
//     ...TodoAppMemberSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, TodoAppMemberSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------