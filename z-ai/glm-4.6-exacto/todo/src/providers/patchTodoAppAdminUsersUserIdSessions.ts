import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminUsersUserIdSessions(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession.ISummary> {
  // Step 1: Ensure user exists (privacy requirement)
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("User not found", 404);
  }

  // Step 2: Build filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build sorting order
  const orderBy =
    props.body.sort &&
    (props.body.sort === "created_at" || props.body.sort === "expired_at")
      ? {
          [props.body.sort]: (props.body.order === "asc"
            ? "asc"
            : "desc") as Prisma.SortOrder,
        }
      : { created_at: "desc" as Prisma.SortOrder };

  // Build where clause
  const where = {
    user_id: props.userId,
    ...(props.body.ip && { ip: props.body.ip }),
    ...(props.body.referrer && { referrer: props.body.referrer }),
    // Date range filter
    ...((props.body.created_from || props.body.created_to) && {
      created_at: {
        ...(props.body.created_from && { gte: props.body.created_from }),
        ...(props.body.created_to && { lte: props.body.created_to }),
      },
    }),
    // Expired filter: true => only expired sessions, false => only active, undefined/null => both
    ...(props.body.expired === true
      ? { expired_at: { not: null } }
      : props.body.expired === false
        ? { expired_at: null }
        : {}),
  };

  // Step 3: Query and count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_user_sessions.count({
      where,
    }),
  ]);

  // Step 4: Map DB records to DTO
  const data = sessions.map((session) => ({
    id: session.id,
    user_id: session.user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      typeof session.expired_at === "object" && session.expired_at
        ? toISOStringSafe(session.expired_at)
        : session.expired_at === null
          ? null
          : undefined, // careful handling for optional+nullable
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
