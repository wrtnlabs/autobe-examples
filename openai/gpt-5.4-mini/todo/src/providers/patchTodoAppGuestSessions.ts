import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberSession";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppGuestSessions(props: {
  guest: GuestPayload;
  body: ITodoAppMemberSession.IRequest;
}): Promise<IPageITodoAppMemberSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const rows = await MyGlobal.prisma.todo_app_member_sessions.findMany({
    where: {
      member: {
        id: props.guest.id,
        deleted_at: null,
      },
    },
    orderBy: {
      created_at: "desc",
    },
    skip,
    take: limit,
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
  });
  const records: number = await MyGlobal.prisma.todo_app_member_sessions.count({
    where: {
      member: {
        id: props.guest.id,
        deleted_at: null,
      },
    },
  });
  return {
    data: rows.map(
      (row): ITodoAppMemberSession.ISummary => ({
        id: row.id,
        ip: row.ip,
        href: row.href,
        referrer: row.referrer,
        created_at: row.created_at.toISOString(),
        expired_at: row.expired_at.toISOString(),
      }),
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
