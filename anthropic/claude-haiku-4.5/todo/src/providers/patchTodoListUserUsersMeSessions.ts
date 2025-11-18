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

export async function patchTodoListUserUsersMeSessions(props: {
  user: UserPayload;
  body: ITodoListUserSession.IRequest;
}): Promise<IPageITodoListUserSession.ISummary> {
  const userId = props.user.id;
  const q = props.body.q;
  const activeOnly = props.body.active_only;
  const ip = props.body.ip;
  const href = props.body.href;
  const referrer = props.body.referrer;
  const createdFrom = props.body.created_from;
  const createdTo = props.body.created_to;
  const expiredFrom = props.body.expired_from;
  const expiredTo = props.body.expired_to;

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";
  const skip = (page - 1) * limit;

  // WHERE condition
  const where: Record<string, any> = {
    todo_list_user_id: userId,
    ...(activeOnly === true && { expired_at: null }),
    ...(!!ip && { ip: ip }),
    ...(!!href && { href: href }),
    ...(!!referrer && { referrer: referrer }),
    ...(!!q && {
      OR: [
        { ip: { contains: q } },
        { href: { contains: q } },
        { referrer: { contains: q } },
      ],
    }),
    ...(!!createdFrom || !!createdTo
      ? {
          created_at: {
            ...(!!createdFrom && { gte: createdFrom }),
            ...(!!createdTo && { lte: createdTo }),
          },
        }
      : {}),
    ...(!!expiredFrom || !!expiredTo
      ? {
          expired_at: {
            ...(!!expiredFrom && { gte: expiredFrom }),
            ...(!!expiredTo && { lte: expiredTo }),
          },
        }
      : {}),
  };

  // Fetch data and total count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.todo_list_user_sessions.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_user_sessions.count({ where }),
  ]);

  const data: ITodoListUserSession.ISummary[] = records.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
