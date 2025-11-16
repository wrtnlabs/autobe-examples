import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { IPageITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function patchTodoListGuestTodoListUserSessions(props: {
  guest: GuestPayload;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 100;

  const safePage = page satisfies number as number;
  const safeLimit = limit satisfies number as number;

  const skip = (safePage - 1) * safeLimit;

  const where = {
    ...(props.body.user_id === undefined
      ? {}
      : { todo_list_user_id: props.body.user_id ?? undefined }),
    ...(props.body.status === undefined
      ? {}
      : { status: props.body.status ?? undefined }),
    ...(props.body.created_at_start === undefined &&
    props.body.created_at_end === undefined
      ? {}
      : {
          created_at: {
            ...(props.body.created_at_start === null ||
            props.body.created_at_start === undefined
              ? {}
              : { gte: props.body.created_at_start }),
            ...(props.body.created_at_end === null ||
            props.body.created_at_end === undefined
              ? {}
              : { lte: props.body.created_at_end }),
          },
        }),
    ...(props.body.expires_at_start === undefined &&
    props.body.expires_at_end === undefined
      ? {}
      : {
          expired_at: {
            ...(props.body.expires_at_start === null ||
            props.body.expires_at_start === undefined
              ? {}
              : { gte: props.body.expires_at_start }),
            ...(props.body.expires_at_end === null ||
            props.body.expires_at_end === undefined
              ? {}
              : { lte: props.body.expires_at_end }),
          },
        }),
  };

  const orderByField = props.body.sort_by ?? "created_at";
  const orderDirection = props.body.order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { [orderByField]: orderDirection },
      select: {
        id: true,
        todo_list_user_id: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  return {
    pagination: {
      current: safePage,
      limit: safeLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
    data: data.map((session) => ({
      id: session.id,
      user_id: session.todo_list_user_id satisfies string as string,
      started_at: toISOStringSafe(session.created_at),
      last_active_at: "1970-01-01T00:00:00.000Z" satisfies string as string,
      is_active: false,
    })),
  };
}
