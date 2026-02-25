import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppUserSessionAtSummaryTransformer } from "../transformers/TodoAppUserSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserSessions(props: {
  user: UserPayload;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    todo_app_user_id: props.user.id,
    ...(props.body.ip_pattern && { ip: { contains: props.body.ip_pattern } }),
    ...(props.body.created_at_after && {
      created_at: { gte: props.body.created_at_after },
    }),
    ...(props.body.created_at_before && {
      created_at: { lte: props.body.created_at_before },
    }),
    ...(props.body.expired_at_after && {
      expired_at: { gte: props.body.expired_at_after },
    }),
    ...(props.body.expired_at_before && {
      expired_at: { lte: props.body.expired_at_before },
    }),
  } satisfies Prisma.todo_app_user_sessionsWhereInput;
  const data = await MyGlobal.prisma.todo_app_user_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: props.body.sort_by
      ? {
          [props.body.sort_by]:
            props.body.sort_order === "desc" ? "desc" : "asc",
        }
      : { created_at: "desc" },
    ...TodoAppUserSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_user_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppUserSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageITodoAppUserSession.ISummary;
}
