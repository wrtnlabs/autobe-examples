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

export async function patchTodoListUserTodoListUsersUserIdTodoListUserSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const userExists = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  if (!userExists) {
    throw new HttpException("User not found", 404);
  }

  const page = (props.body.page ??
    1) satisfies number as number satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (props.body.limit ??
    100) satisfies number as number satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  const search = props.body.search;
  const filterActive = props.body.filterActive;
  const rawSortByProperty = props.body.sortBy ?? "created_at";
  const rawSortOrder = props.body.sortOrder ?? "desc";

  // Narrow the sortOrder to 'asc' | 'desc'
  const sortOrder: "asc" | "desc" =
    rawSortOrder === "asc" || rawSortOrder === "desc" ? rawSortOrder : "desc";

  // Narrow sortByProperty to allowed list
  const allowedSortBy = new Set([
    "created_at",
    "ip",
    "href",
    "referrer",
    "expired_at",
  ]);
  const sortByProperty = allowedSortBy.has(rawSortByProperty)
    ? rawSortByProperty
    : "created_at";

  const whereCondition: Prisma.todo_list_user_sessionsWhereInput = {
    todo_list_user_id: props.userId,
  };

  if (filterActive === true) {
    whereCondition.expired_at = null;
  }

  if (search) {
    whereCondition.OR = [
      { ip: { contains: search } },
      { href: { contains: search } },
      { referrer: { contains: search } },
    ];
  }

  // Construct orderBy with properly typed property
  const orderBy: Prisma.todo_list_user_sessionsOrderByWithRelationInput = {
    [sortByProperty]: sortOrder,
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: orderBy,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(
        total / limit,
      ) satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: sessions.map((session) => ({
      id: session.id,
      todo_list_user_id: session.todo_list_user_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
  };
}
