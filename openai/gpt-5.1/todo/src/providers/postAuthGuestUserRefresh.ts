import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestUserRefresh(props: {
  body: ITodoAppGuestUser.IRefreshRequest;
}): Promise<ITodoAppGuestUser.IAuthorized> {
  // 1. Decode and verify the incoming refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (_error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Validate decoded payload shape for guestUser refresh tokens
  if (!decoded || typeof decoded !== "object") {
    throw new HttpException("Invalid token payload", 401);
  }

  const decodedPayload = decoded as {
    id?: string;
    session_id?: string;
    type?: string;
    tokenType?: string;
  };

  if (decodedPayload.type !== "guestUser") {
    throw new HttpException("Invalid token type", 403);
  }

  if (decodedPayload.tokenType && decodedPayload.tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 403);
  }

  if (!decodedPayload.id || !decodedPayload.session_id) {
    throw new HttpException("Invalid token payload", 401);
  }

  const guestId = decodedPayload.id;
  const sessionId = decodedPayload.session_id;

  // 3. Load current guest state from database
  const guest = await MyGlobal.prisma.todo_app_guestusers.findUnique({
    where: {
      id: guestId,
    },
  });

  if (!guest) {
    // Guest record removed or never existed: treat as expired/revoked
    throw new HttpException("Guest session expired or revoked", 401);
  }

  // 4. Prepare new token expiry timestamps as ISO strings (no Date type annotations)
  const nowMillis = Date.now();
  const accessExpiryMillis = nowMillis + 60 * 60 * 1000; // 1 hour
  const refreshExpiryMillis = nowMillis + 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessExpiresAt = toISOStringSafe(new Date(accessExpiryMillis));
  const refreshExpiresAt = toISOStringSafe(new Date(refreshExpiryMillis));

  const createdAtForToken = toISOStringSafe(new Date(nowMillis));

  // 5. Generate new access and refresh JWTs, preserving guest id and session id
  const accessToken = jwt.sign(
    {
      type: decodedPayload.type,
      id: guestId,
      session_id: sessionId,
      created_at: createdAtForToken,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decodedPayload.type,
      id: guestId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: createdAtForToken,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6. Update guest.updated_at to reflect latest interaction
  const updatedGuest = await MyGlobal.prisma.todo_app_guestusers.update({
    where: {
      id: guest.id,
    },
    data: {
      updated_at: new Date(nowMillis),
    },
  });

  // 7. Build IAuthorizationToken structure
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };

  // 8. Map DB guest record to ITodoAppGuestUser.IAuthorized
  return {
    id: updatedGuest.id,
    external_ref: updatedGuest.external_ref ?? null,
    created_at: toISOStringSafe(updatedGuest.created_at),
    updated_at: toISOStringSafe(updatedGuest.updated_at),
    accessToken,
    refreshToken,
    token,
  };
}
