import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: ITodoListGuest.IRefresh;
}): Promise<ITodoListGuest.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "guest";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.todo_list_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_list_guest_id: decoded.id,
      expired_at: null,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Calculate expiration times in ISO string format using toISOStringSafe
  const now = Date.now();
  const accessExpires = toISOStringSafe(new Date(now + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date(now)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.todo_list_guest_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: new Date(now + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    id: decoded.id,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
