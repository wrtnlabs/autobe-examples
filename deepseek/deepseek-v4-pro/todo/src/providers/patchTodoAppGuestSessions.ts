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
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { TodoAppMemberSessionAtSummaryTransformer } from "../transformers/TodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppGuestSessions(props: {
  guest: GuestPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.todo_app_member_sessionsWhereInput = {};
  if (props.body.active != null) {
    const now: string = new Date().toISOString();
    if (props.body.active) {
      whereInput.expired_at = { gt: now };
    } else {
      whereInput.expired_at = { lte: now };
    }
  }
  if (props.body.startDate != null || props.body.endDate != null) {
    whereInput.created_at = {
      ...(props.body.startDate != null ? { gte: props.body.startDate } : {}),
      ...(props.body.endDate != null ? { lte: props.body.endDate } : {}),
    };
  }
  const data = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoAppMemberSessionAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.todo_app_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
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
// export async function patchTodoAppGuestSessions(props: {
//   guest: GuestPayload;
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