import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
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

export async function getTodoAppGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberSession> {
  const session =
    await MyGlobal.prisma.todo_app_guest_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
    });
  if (session.todo_app_guest_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  const guest = await MyGlobal.prisma.todo_app_guests.findUniqueOrThrow({
    where: { id: session.todo_app_guest_id },
  });
  return {
    id: session.id as string & tags.Format<"uuid">,
    ip: session.ip,
    href: session.href as string & tags.Format<"uri">,
    referrer: session.referrer as string & tags.Format<"uri">,
    created_at: session.created_at.toISOString() as string &
      tags.Format<"date-time">,
    expired_at: session.expired_at.toISOString() as string &
      tags.Format<"date-time">,
    member: {
      id: guest.id as string & tags.Format<"uuid">,
      display_name: "Guest",
    } satisfies ITodoAppMember.ISummary,
  } satisfies ITodoAppMemberSession;
}
