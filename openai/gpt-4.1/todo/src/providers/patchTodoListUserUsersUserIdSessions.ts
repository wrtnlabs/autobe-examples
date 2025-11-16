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
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  // Only allow session listing for self—strictly enforced
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You may only list your own sessions.",
      403,
    );
  }

  // Prepare pagination values and bounds
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build the base where clause for querying sessions by user ID
  const where = {
    user_id: props.userId,
    ...(props.body.filterIp ? { ip: props.body.filterIp } : {}),
    ...(props.body.filterHref ? { href: props.body.filterHref } : {}),
    ...(props.body.filterReferrer
      ? { referrer: props.body.filterReferrer }
      : {}),
  };

  // Determine sorting field and order, default to created_at desc
  const sortBy = props.body.sortBy ?? "created_at";
  const order: "asc" | "desc" = props.body.order ?? "desc";

  // Retrieve user (for user summary)
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
    select: {
      id: true,
      email: true,
    },
  });
  if (!user) {
    throw new HttpException("User does not exist.", 404);
  }

  // Fetch sessions and total count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  // Map results to ISummary structure
  const data = sessions.map((session) => ({
    id: session.id,
    user: {
      id: user.id,
      email: user.email,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : null,
  }));

  // Compute pagination summary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
