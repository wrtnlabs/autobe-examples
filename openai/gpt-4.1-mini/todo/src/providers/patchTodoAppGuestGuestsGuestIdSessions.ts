import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { IPageITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function patchTodoAppGuestGuestsGuestIdSessions(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  body: ITodoAppGuestSession.IRequest;
}): Promise<IPageITodoAppGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where = {
    guest_id: props.guestId,
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.createdBefore
      ? { created_at: { lt: props.body.createdBefore } }
      : {}),
    ...(props.body.createdAfter
      ? { created_at: { gt: props.body.createdAfter } }
      : {}),
    ...(props.body.expiredBefore
      ? { expired_at: { lt: props.body.expiredBefore } }
      : {}),
    ...(props.body.expiredAfter
      ? { expired_at: { gt: props.body.expiredAfter } }
      : {}),
  } satisfies Prisma.todo_app_guest_sessionsWhereInput;
  const orderByInput = (
    props.body.sortBy
      ? {
          [props.body.sortBy]: (props.body.sortOrder ?? "asc") as
            | "asc"
            | "desc",
        }
      : { created_at: "desc" as const }
  ) satisfies Prisma.todo_app_guest_sessionsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.todo_app_guest_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      guest_id: true,
      created_at: true,
      href: true,
      referrer: true,
      ip: true,
      expired_at: true,
    },
  });
  const total = await MyGlobal.prisma.todo_app_guest_sessions.count({ where });
  return {
    data: data.map((session) => ({
      id: session.id,
      guest_id: session.guest_id,
      created_at: toISOStringSafe(session.created_at),
      href: session.href === null ? null : session.href,
      referrer: session.referrer === null ? null : session.referrer,
      ip: session.ip === null ? null : session.ip,
      expired_at:
        session.expired_at === null
          ? null
          : toISOStringSafe(session.expired_at),
    })),
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
