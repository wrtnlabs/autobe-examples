import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
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

export async function patchMultiUserTodoGuestSessions(props: {
  guest: GuestPayload;
  body: IMultiUserTodoMemberSession.IRequest;
}): Promise<IMultiUserTodoMemberSession.ISummary> {
  const now = MyGlobal.env.API_PORT as unknown;
  const session =
    await MyGlobal.prisma.multi_user_todo_guest_sessions.findFirst({
      where: {
        id: props.guest.session_id,
        deleted_at: null,
      },
      select: {
        id: true,
        multi_user_todo_guest_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session context is missing or invalid", 403);
  }
  if (session.expired_at.getTime() <= new Date().getTime()) {
    throw new HttpException("Session context has expired", 403);
  }
  const data = {
    ...(props.body.ip !== undefined ? { ip: props.body.ip } : undefined),
    ...(props.body.href !== undefined ? { href: props.body.href } : undefined),
    ...(props.body.referrer !== undefined
      ? { referrer: props.body.referrer }
      : undefined),
    ...(props.body.expired_at !== undefined
      ? { expired_at: new Date(props.body.expired_at) }
      : undefined),
  };
  const cleanedData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Prisma.multi_user_todo_guest_sessionsUpdateInput;
  await MyGlobal.prisma.multi_user_todo_guest_sessions.update({
    where: { id: session.id },
    data: cleanedData,
  });
  const refreshed =
    await MyGlobal.prisma.multi_user_todo_guest_sessions.findUniqueOrThrow({
      where: { id: session.id },
      select: {
        id: true,
        multi_user_todo_guest_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  const createdAt = refreshed.created_at.toISOString();
  const expiredAt = refreshed.expired_at.toISOString();
  return {
    id: typia.assert<string & tags.Format<"uuid">>(refreshed.id),
    multiUserTodoMemberId: typia.assert<string & tags.Format<"uuid">>(
      refreshed.multi_user_todo_guest_id,
    ),
    ip: typia.assert<string>(refreshed.ip),
    href: typia.assert<string & tags.MaxLength<80000>>(refreshed.href),
    referrer: typia.assert<string & tags.MaxLength<80000>>(refreshed.referrer),
    createdAt: typia.assert<string & tags.Format<"date-time">>(createdAt),
    expiredAt: typia.assert<string & tags.Format<"date-time">>(expiredAt),
  };
}
