import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthGuestRefresh(props: {
  body: IDiscussionBoardGuest.IRefresh;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Assert and validate token payload
  const payload = typia.assert<{
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
    created_at: string;
  }>(decoded);
  if (payload.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and matches
  const session =
    await MyGlobal.prisma.discussion_board_guest_sessions.findFirst({
      where: {
        id: payload.session_id,
        discussion_board_guest_id: payload.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest account not deleted
  const guest = await MyGlobal.prisma.discussion_board_guests.findUnique({
    where: { id: payload.id },
  });
  if (!guest) {
    throw new HttpException("Guest account not found", 404);
  }
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 30 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const accessExpiresIso = accessExpires.toISOString();
  const refreshExpiresIso = refreshExpires.toISOString();
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: payload.id,
      session_id: payload.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: payload.id,
      session_id: payload.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.discussion_board_guest_sessions.update({
    where: { id: payload.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return authorized response
  return {
    id: payload.id,
    displayName: undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso as string & tags.Format<"date-time">,
      refreshable_until: refreshExpiresIso as string & tags.Format<"date-time">,
    },
  };
}
