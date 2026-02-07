import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoUserSessions(props: {
  user: UserPayload;
  body: ITodoUserSession.IRequest;
}): Promise<IPageITodoUserSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const currentIso = toISOStringSafe(new Date());
  const whereInput = {
    user: { id: props.user.id },
    ...(props.body.active === true && { expired_at: { gt: currentIso } }),
    ...(props.body.active === false && { expired_at: { lte: currentIso } }),
  } satisfies Prisma.todo_user_sessionsWhereInput;
  const skip = (page - 1) * limit;
  const take = limit;
  const data = await MyGlobal.prisma.todo_user_sessions.findMany({
    where: whereInput,
    skip,
    take,
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      user: { select: { id: true } },
    },
  });
  const total = await MyGlobal.prisma.todo_user_sessions.count({
    where: whereInput,
  });
  const mappedData = data.map((item) => ({
    id: item.id,
    ip: item.ip,
    href: item.href,
    referrer: item.referrer,
    created_at: toISOStringSafe(item.created_at),
    expired_at: toISOStringSafe(item.expired_at),
    user: { id: item.user.id },
  }));
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return { data: mappedData, pagination };
}
