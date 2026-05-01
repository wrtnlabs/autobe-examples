import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberPasswordResetAtSummaryTransformer } from "../transformers/TodoAppMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberPasswordResets(props: {
  member: MemberPayload;
  body: ITodoAppMemberPasswordReset.IRequest;
}): Promise<IPageITodoAppMemberPasswordReset.ISummary> {
  const now: string = new Date().toISOString();
  const limit: number = props.body.limit ?? 20;
  const cursorProvided: boolean = props.body.cursor !== undefined;
  const page: number = props.body.page ?? 1;
  const andConditions: Array<Prisma.todo_app_member_password_resetsWhereInput> =
    [{ todo_app_member_id: props.member.id }];
  if (props.body.status === "active") {
    andConditions.push({ expired_at: { gte: now } });
  } else if (props.body.status === "expired") {
    andConditions.push({ expired_at: { lt: now } });
  }
  if (props.body.created_from !== undefined) {
    andConditions.push({ created_at: { gte: props.body.created_from } });
  }
  if (props.body.created_to !== undefined) {
    andConditions.push({ created_at: { lte: props.body.created_to } });
  }
  if (props.body.cursor !== undefined) {
    andConditions.push({ created_at: { lt: props.body.cursor } });
  }
  const whereInput = {
    AND: andConditions,
  } satisfies Prisma.todo_app_member_password_resetsWhereInput;
  const skip: number | undefined = cursorProvided
    ? undefined
    : (page - 1) * limit;
  const records =
    await MyGlobal.prisma.todo_app_member_password_resets.findMany({
      where: whereInput,
      ...TodoAppMemberPasswordResetAtSummaryTransformer.select(),
      orderBy: { created_at: "desc" },
      take: limit,
      ...(skip !== undefined && skip > 0 ? { skip } : {}),
    });
  const total: number =
    await MyGlobal.prisma.todo_app_member_password_resets.count({
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
      TodoAppMemberPasswordResetAtSummaryTransformer.transform,
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
// import { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
// import { IPageITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchTodoAppMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: ITodoAppMemberPasswordReset.IRequest;
// }): Promise<IPageITodoAppMemberPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.todo_app_member_password_resets.findMany({
//     ...TodoAppMemberPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, TodoAppMemberPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------