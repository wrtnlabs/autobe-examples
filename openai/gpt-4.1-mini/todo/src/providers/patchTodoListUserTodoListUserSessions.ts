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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodoListUserSessions(props: {
  user: UserPayload;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<0> = props.body
    .page satisfies number as number;
  const limit: number & tags.Type<"int32"> & tags.Minimum<0> = props.body
    .limit satisfies number as number;
  const skip = (page - 1) * limit;

  const currentTimestamp = toISOStringSafe(new Date());

  const where = {
    ...(props.body.user_id !== undefined
      ? props.body.user_id === null
        ? { user_id: null }
        : { user_id: props.body.user_id }
      : {}),
    ...(props.body.status !== undefined && props.body.status !== null
      ? props.body.status === "active"
        ? { is_active: true }
        : props.body.status === "expired"
          ? { expires_at: { lt: currentTimestamp } }
          : props.body.status === "revoked"
            ? { is_revoked: true }
            : {}
      : {}),
    ...(props.body.created_at_start || props.body.created_at_end
      ? {
          created_at: {
            ...(props.body.created_at_start
              ? { gte: props.body.created_at_start }
              : {}),
            ...(props.body.created_at_end
              ? { lte: props.body.created_at_end }
              : {}),
          },
        }
      : {}),
    ...(props.body.expires_at_start || props.body.expires_at_end
      ? {
          expires_at: {
            ...(props.body.expires_at_start
              ? { gte: props.body.expires_at_start }
              : {}),
            ...(props.body.expires_at_end
              ? { lte: props.body.expires_at_end }
              : {}),
          },
        }
      : {}),
  };

  const orderBy =
    props.body.sort_by !== undefined && props.body.order !== undefined
      ? {
          [props.body.sort_by]: props.body.order satisfies "asc" | "desc" as
            | "asc"
            | "desc",
        }
      : { created_at: "desc" as "desc" };

  const [sessions, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      user_id: session.todo_list_user_id,
      started_at: toISOStringSafe(session.created_at),
      last_active_at: toISOStringSafe(new Date(0)),
      is_active: false,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  } satisfies IPageITodoListUserSession.ISummary;
}
