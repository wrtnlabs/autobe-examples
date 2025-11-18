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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoListAdminUsersUserIdSessions(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  // 1. Verify user existence
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // 2. Compose filters
  const filters: Record<string, unknown> = {
    todo_list_user_id: props.userId,
    ...(props.body.ip !== undefined && { ip: props.body.ip }),
    ...(props.body.href !== undefined && { href: props.body.href }),
    ...(props.body.referrer !== undefined && { referrer: props.body.referrer }),
    // Expiry: true for expired, false for active:
    ...(typeof props.body.expired === "boolean"
      ? props.body.expired
        ? { expired_at: { not: null } }
        : { expired_at: null }
      : {}),
    // Date range for created_at:
    ...(props.body.created_from || props.body.created_to
      ? {
          created_at: {
            ...(props.body.created_from && { gte: props.body.created_from }),
            ...(props.body.created_to && { lte: props.body.created_to }),
          },
        }
      : {}),
  };

  // 3. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // 4. Sorting
  let orderBy: { [key: string]: "asc" | "desc" }[] = [];
  if (props.body.order_by && props.body.order) {
    orderBy = [{ [props.body.order_by]: props.body.order }];
  } else {
    orderBy = [{ created_at: "desc" }];
  }

  // 5. Fetch data and total count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({
      where: filters,
    }),
  ]);

  // 6. Map to ISummary enforcing explicit null vs undefined for expired_at
  const data = sessions.map((s) => ({
    id: s.id,
    user_id: s.todo_list_user_id,
    created_at: toISOStringSafe(s.created_at),
    expired_at:
      s.expired_at === null || s.expired_at === undefined
        ? null
        : toISOStringSafe(s.expired_at),
    ip: s.ip,
    href: s.href,
    referrer: s.referrer,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
