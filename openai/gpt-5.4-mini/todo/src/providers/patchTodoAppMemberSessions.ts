import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberSessionAtSummaryTransformer } from "../transformers/TodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberSessions(props: {
  member: MemberPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const search: string | undefined = (() => {
    const trimmed: string | undefined = props.body.search?.trim();
    return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
  })();
  const where: Prisma.todo_app_member_sessionsWhereInput = {
    todo_app_member_id: props.member.id,
    ...(search === undefined
      ? {}
      : {
          OR: [
            { ip: { contains: search, mode: "insensitive" } },
            { href: { contains: search, mode: "insensitive" } },
            { referrer: { contains: search, mode: "insensitive" } },
          ],
        }),
  };
  const orderBy: Prisma.todo_app_member_sessionsOrderByWithRelationInput =
    props.body.sort === undefined
      ? { created_at: "desc" }
      : props.body.sort === "createdAt"
        ? { created_at: props.body.order ?? "desc" }
        : props.body.sort === "expiredAt"
          ? { expired_at: props.body.order ?? "desc" }
          : props.body.sort === "ip"
            ? { ip: props.body.order ?? "desc" }
            : props.body.sort === "href"
              ? { href: props.body.order ?? "desc" }
              : { referrer: props.body.order ?? "desc" };
  const records: Prisma.todo_app_member_sessionsGetPayload<
    ReturnType<typeof TodoAppMemberSessionAtSummaryTransformer.select>
  >[] = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    ...TodoAppMemberSessionAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.todo_app_member_sessions.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
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
// import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchTodoAppMemberSessions(props: {
//   member: MemberPayload;
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