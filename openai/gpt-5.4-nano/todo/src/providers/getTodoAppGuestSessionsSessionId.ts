import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
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
}): Promise<ITodoAppGuestSession> {
  const memberId = props.guest.id;
  const memberSession =
    await MyGlobal.prisma.todo_app_member_sessions.findUnique({
      where: { id: props.sessionId },
      select: {
        id: true,
        todo_app_member_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (memberSession) {
    if (memberSession.todo_app_member_id !== memberId) {
      throw new HttpException("Not Found", 404);
    }
    return {
      id: memberSession.id as string & tags.Format<"uuid">,
      ip:
        memberSession.ip === null
          ? null
          : (memberSession.ip as string & tags.Format<"ipv4">),
      href: memberSession.href as string & tags.Format<"uri">,
      referrer: memberSession.referrer as string & tags.Format<"uri">,
      created_at: toISOStringSafe(memberSession.created_at),
      expired_at: toISOStringSafe(memberSession.expired_at),
    };
  }
  const guestSession = await MyGlobal.prisma.todo_app_guest_sessions.findUnique(
    {
      where: { id: props.sessionId },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        deleted_at: true,
      },
    },
  );
  if (guestSession === null || guestSession.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: guestSession.id as string & tags.Format<"uuid">,
    ip:
      guestSession.ip === null
        ? null
        : (guestSession.ip as string & tags.Format<"ipv4">),
    href: guestSession.href as string & tags.Format<"uri">,
    referrer: guestSession.referrer as string & tags.Format<"uri">,
    created_at: toISOStringSafe(guestSession.created_at),
    expired_at: toISOStringSafe(guestSession.expired_at),
  };
}
