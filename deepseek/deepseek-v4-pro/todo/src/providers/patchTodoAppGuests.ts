import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppGuestAtSummaryTransformer } from "../transformers/TodoAppGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppGuests(props: {
  body: ITodoAppGuest.IRequest;
}): Promise<IPageITodoAppGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.todo_app_guestsWhereInput = props.body.fingerprint
    ? { fingerprint: props.body.fingerprint }
    : {};
  const records = await MyGlobal.prisma.todo_app_guests.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoAppGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_guests.count({ where });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      TodoAppGuestAtSummaryTransformer.transform,
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
// import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
// import { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchTodoAppGuests(props: {
//   body: ITodoAppGuest.IRequest;
// }): Promise<IPageITodoAppGuest.ISummary> {
//   const records = await MyGlobal.prisma.todo_app_guests.findMany({
//     ...TodoAppGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, TodoAppGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------