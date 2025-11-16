import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserJoin";
import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";

export async function postAuthGuestUserJoin(props: {
  body: ITodoAppGuestUserJoin.IRequest;
}): Promise<ITodoAppGuestUser.IAuthorized> {
  const body = props.body;

  const createDateTimeNow = (): string & tags.Format<"date-time"> => {
    const value = toISOStringSafe(new Date());
    return value as string & tags.Format<"date-time">;
  };

  const createDateTimeAfterMs = (
    milliseconds: number,
  ): string & tags.Format<"date-time"> => {
    const value = toISOStringSafe(new Date(Date.now() + milliseconds));
    return value as string & tags.Format<"date-time">;
  };

  const now = createDateTimeNow();
  const accessExpiredAt = createDateTimeAfterMs(60 * 60 * 1000);
  const refreshableUntil = createDateTimeAfterMs(7 * 24 * 60 * 60 * 1000);

  let guestRecord =
    body.external_reference !== undefined && body.external_reference !== null
      ? await MyGlobal.prisma.todo_app_guestusers.findFirst({
          where: { external_reference: body.external_reference },
        })
      : null;

  if (!guestRecord) {
    const guestId = v4();
    guestRecord = await MyGlobal.prisma.todo_app_guestusers.create({
      data: {
        id: guestId,
        external_reference:
          body.external_reference !== undefined &&
          body.external_reference !== null
            ? body.external_reference
            : null,
        display_name:
          body.display_name !== undefined && body.display_name !== null
            ? body.display_name
            : null,
        status: "active",
        created_at: now,
        updated_at: now,
      },
    });
  } else if (body.display_name !== undefined && body.display_name !== null) {
    guestRecord = await MyGlobal.prisma.todo_app_guestusers.update({
      where: { id: guestRecord.id },
      data: {
        display_name: body.display_name,
        updated_at: now,
      },
    });
  }

  const resolvedIp =
    body.ip !== undefined && body.ip !== null && body.ip.length > 0
      ? body.ip
      : "0.0.0.0";

  const sessionId = v4();
  const sessionRecord =
    await MyGlobal.prisma.todo_app_guestuser_sessions.create({
      data: {
        id: sessionId,
        todo_app_guestuser_id: guestRecord.id,
        ip: resolvedIp,
        href: body.href,
        referrer: body.referrer,
        created_at: now,
        expired_at: null,
      },
    });

  const accessToken = jwt.sign(
    {
      type: "guestUser",
      id: guestRecord.id,
      session_id: sessionRecord.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "guestUser",
      id: guestRecord.id,
      session_id: sessionRecord.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const guestSummary: ITodoAppGuestUser.ISummary = {
    id: guestRecord.id,
    external_reference:
      guestRecord.external_reference === null
        ? null
        : guestRecord.external_reference,
    display_name:
      guestRecord.display_name === null ? null : guestRecord.display_name,
    status: guestRecord.status,
    created_at: toISOStringSafe(guestRecord.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(guestRecord.updated_at) as string &
      tags.Format<"date-time">,
  };

  const sessionSummary: ITodoAppGuestUserSession.ISummary = {
    id: sessionRecord.id,
    guestUser: guestSummary,
    ip: sessionRecord.ip,
    href: sessionRecord.href,
    referrer: sessionRecord.referrer,
    created_at: toISOStringSafe(sessionRecord.created_at) as string &
      tags.Format<"date-time">,
    expired_at:
      sessionRecord.expired_at === null
        ? null
        : (toISOStringSafe(sessionRecord.expired_at) as string &
            tags.Format<"date-time">),
  };

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiredAt,
    refreshable_until: refreshableUntil,
  };

  return {
    token,
    guest: guestSummary,
    session: sessionSummary,
  };
}
