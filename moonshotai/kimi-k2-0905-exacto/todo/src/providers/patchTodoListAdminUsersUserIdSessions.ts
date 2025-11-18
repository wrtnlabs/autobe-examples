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
  // Extract pagination, sort, and search from request (apply backend defaults)
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderByKey = props.body.order_by ?? "created_at";
  const orderDir = props.body.order ?? "desc";
  const search = props.body.search?.trim();

  // Build Prisma 'where' filter
  const where: Record<string, unknown> = {
    todo_list_user_id: props.userId,
    ...(search && {
      OR: [
        { ip: { contains: search } },
        { href: { contains: search } },
        { referrer: { contains: search } },
      ],
    }),
  };

  // Assemble Prisma 'orderBy'
  const orderBy = { [orderByKey]: orderDir };

  // Fetch records and count concurrently
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({
      where,
    }),
  ]);

  // Map to ISummary DTO, ensuring type safety for date strings
  const data: ITodoListUserSession.ISummary[] = sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== undefined && session.expired_at !== null
        ? toISOStringSafe(session.expired_at)
        : null,
  }));

  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
