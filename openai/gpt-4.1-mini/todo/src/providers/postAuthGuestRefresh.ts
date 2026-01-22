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
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  const secretKey: string = MyGlobal.env.JWT_SECRET_KEY;
  let decodedToken: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
  };
  try {
    decodedToken = jwt.verify(props.body.id, secretKey, {
      issuer: "autobe",
    }) as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "guest";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decodedToken.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  const guest = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { id: decodedToken.id },
  });
  if (!guest) {
    throw new HttpException("Guest session does not exist", 401);
  }
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  function nowIsoString(): string & tags.Format<"date-time"> {
    return toISOStringSafe(new Date());
  }
  const accessToken = jwt.sign(
    {
      type: decodedToken.type,
      id: decodedToken.id,
      session_id: decodedToken.session_id,
      created_at: nowIsoString(),
    },
    secretKey,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: decodedToken.type,
      id: decodedToken.id,
      session_id: decodedToken.session_id,
      tokenType: "refresh",
      created_at: nowIsoString(),
    },
    secretKey,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  return {
    id: decodedToken.id,
    guestIdentifier: guest.guest_identifier,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt: guest.updated_at ? toISOStringSafe(guest.updated_at) : null,
    deletedAt: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
      token: true,
      type: true,
      issued_at: true,
      revoked_at: null,
      todo_app_user_id: null,
      todo_app_guest_id: true,
      todo_app_user_session_id: null,
    },
  };
}
