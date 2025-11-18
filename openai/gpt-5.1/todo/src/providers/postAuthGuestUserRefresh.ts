import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

export async function postAuthGuestUserRefresh(props: {
  guestUser: GuestuserPayload;
  body: ITodoAppGuestUser.IRefresh;
}): Promise<ITodoAppGuestUser.IAuthorized> {
  // Step 1: verify the refresh token from request body
  let decodedRaw: unknown;

  try {
    decodedRaw = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch (_error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Narrow the decoded payload shape without relying on `as any`.
  const decodedObject = typeof decodedRaw === "string" ? undefined : decodedRaw;

  if (
    !decodedObject ||
    typeof (decodedObject as jwt.JwtPayload).id !== "string" ||
    typeof (decodedObject as jwt.JwtPayload).session_id !== "string" ||
    (decodedObject as jwt.JwtPayload).type !== "guestUser"
  ) {
    throw new HttpException("Invalid refresh token payload for guestUser", 401);
  }

  const decoded = decodedObject as jwt.JwtPayload;

  const decodedId = decoded.id as string;
  const decodedSessionId = decoded.session_id as string;

  // Step 2: validate that the token type and identity align with the injected guestUser payload
  if (decoded.type !== "guestUser") {
    throw new HttpException("Invalid token type for guestUser refresh", 403);
  }

  if (
    decodedId !== props.guestUser.id ||
    decodedSessionId !== props.guestUser.session_id
  ) {
    throw new HttpException(
      "Token subject does not match authenticated guest user",
      403,
    );
  }

  // Step 3: ensure the underlying guest actor still exists and is not soft-deleted
  const guest = await MyGlobal.prisma.todo_app_guestusers.findFirst({
    where: {
      id: props.guestUser.id,
      deleted_at: null,
    },
  });

  if (guest === null) {
    throw new HttpException(
      "Guest user has been deleted or does not exist",
      403,
    );
  }

  // Step 4: compute new token expiration instants
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Step 5: issue new JWT access and refresh tokens preserving the same session_id
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decodedId,
      session_id: decodedSessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decodedId,
      session_id: decodedSessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Step 6: construct the authorized guest user payload.
  const createdAt = toISOStringSafe(guest.created_at);
  const updatedAt = toISOStringSafe(guest.updated_at);

  const deletedAt = guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null;

  return {
    id: guest.id,
    display_name: guest.display_name === null ? null : guest.display_name,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
    metadata: undefined,
    token,
  };
}
