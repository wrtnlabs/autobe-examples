import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { IPageITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function patchTodoAppTodoAdminTodoUsersTodoUserIdSessions(props: {
  todoAdmin: TodoadminPayload;
  todoUserId: string & tags.Format<"uuid">;
  body: ITodoAppTodouserSession.IRequest;
}): Promise<IPageITodoAppTodouserSession.ISummary> {
  // 1) Ensure the target todo user exists
  const todoUser = await MyGlobal.prisma.todo_app_todousers.findUnique({
    where: {
      id: props.todoUserId,
    },
  });

  if (todoUser === null) {
    throw new HttpException("Todo user not found", 404);
  }

  // 2) Derive pagination parameters (1-based in request, 0-based in response)
  const requestedPage = props.body.page ?? 1;
  const requestedLimit = props.body.limit ?? 20;

  const limit = requestedLimit > 100 ? 100 : requestedLimit;
  const page = requestedPage < 1 ? 1 : requestedPage;

  const skip = (page - 1) * limit;

  // 3) Build where condition with mandatory user scope and optional filters
  const where = {
    todo_app_todouser_id: props.todoUserId,
    ...(props.body.isActive === true && {
      expired_at: null,
    }),
    ...(props.body.isActive === false && {
      expired_at: {
        not: null,
      },
    }),
    ...(() => {
      const createdAt: Record<string, unknown> = {};
      if (props.body.createdFrom !== undefined) {
        createdAt.gte = props.body.createdFrom;
      }
      if (props.body.createdTo !== undefined) {
        createdAt.lte = props.body.createdTo;
      }
      if (Object.keys(createdAt).length === 0) return {};
      return { created_at: createdAt };
    })(),
    ...(() => {
      const expiredAt: Record<string, unknown> = {};
      if (props.body.expiredFrom !== undefined) {
        expiredAt.gte = props.body.expiredFrom;
      }
      if (props.body.expiredTo !== undefined) {
        expiredAt.lte = props.body.expiredTo;
      }
      if (Object.keys(expiredAt).length === 0) return {};
      return { expired_at: expiredAt };
    })(),
  };

  const orderByField = props.body.orderBy ?? "created_at";
  const orderDirection = props.body.orderDirection ?? "desc";

  // 4) Query sessions and total count concurrently
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todouser_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [orderByField]: orderDirection,
      },
      include: {
        todoUser: true,
      },
    }),
    MyGlobal.prisma.todo_app_todouser_sessions.count({
      where,
    }),
  ]);

  // 5) Map database rows to DTO summaries
  const data: ITodoAppTodouserSession.ISummary[] = sessions.map((session) => {
    const owner = session.todoUser;

    const todoUserSummary: ITodoAppTodoUser.ISummary = {
      id: owner.id,
      email: owner.email,
      display_name: owner.display_name ?? undefined,
      status: owner.status,
      created_at: toISOStringSafe(owner.created_at),
    };

    return {
      id: session.id,
      todoUser: todoUserSummary,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at:
        session.expired_at === null
          ? null
          : toISOStringSafe(session.expired_at),
    };
  });

  // 6) Build pagination metadata
  const records = total;
  const pages = records === 0 ? 0 : Math.ceil(records / limit);

  const pagination: IPage.IPagination = {
    current: page - 1,
    limit,
    records,
    pages,
  };

  return {
    pagination,
    data,
  };
}
