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
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  // Build created_at conditions
  const createdAtConditions: Prisma.DateTimeFilter<"todo_app_user_sessions"> =
    {};
  if (props.body.created_at_from !== undefined) {
    createdAtConditions.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    createdAtConditions.lte = new Date(props.body.created_at_to);
  }
  // Build expired_at conditions (including is_active filter)
  const expiredAtConditions: Prisma.DateTimeFilter<"todo_app_user_sessions"> =
    {};
  if (props.body.expired_at_from !== undefined) {
    expiredAtConditions.gte = new Date(props.body.expired_at_from);
  }
  if (props.body.expired_at_to !== undefined) {
    expiredAtConditions.lte = new Date(props.body.expired_at_to);
  }
  if (props.body.is_active === true) {
    expiredAtConditions.gt = now;
  } else if (props.body.is_active === false) {
    expiredAtConditions.lte = now;
  }
  const where: Prisma.todo_app_user_sessionsWhereInput = {
    todo_app_user_id: props.user.id,
    ...(Object.keys(createdAtConditions).length > 0 && {
      created_at: createdAtConditions,
    }),
    ...(Object.keys(expiredAtConditions).length > 0 && {
      expired_at: expiredAtConditions,
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip, mode: "insensitive" },
    }),
  } satisfies Prisma.todo_app_user_sessionsWhereInput;
  const sessions = await MyGlobal.prisma.todo_app_user_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...TodoAppUserSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_user_sessions.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      sessions,
      TodoAppUserSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageITodoAppUserSession.ISummary;
}
