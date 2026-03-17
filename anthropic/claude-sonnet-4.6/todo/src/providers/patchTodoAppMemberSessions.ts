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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberSessionAtSummaryTransformer } from "../transformers/TodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberSessions(props: {
  member: MemberPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortDirection = props.body.sortDirection === "ASC" ? "asc" : "desc";
  const now = new Date();
  const whereInput = {
    todo_app_member_id: props.member.id,
    ...(props.body.status === "active"
      ? { expired_at: { gt: now } }
      : props.body.status === "expired"
        ? { expired_at: { lte: now } }
        : {}),
    ...((props.body.createdAtFrom != null ||
      props.body.createdAtTo != null) && {
      created_at: {
        ...(props.body.createdAtFrom != null && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo != null && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
  } satisfies Prisma.todo_app_member_sessionsWhereInput;
  const data = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: sortDirection },
    ...TodoAppMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_member_sessions.count({
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
      data,
      TodoAppMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
