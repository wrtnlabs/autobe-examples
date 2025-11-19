import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IDiscussionBoardGuest.IRefresh;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  interface DecodedTokenPayload {
    type: string;
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
  }

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

  const decodedPayload =
    decoded satisfies unknown as DecodedTokenPayload as DecodedTokenPayload;

  if (decodedPayload.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const guest = await MyGlobal.prisma.discussion_board_guest.findUnique({
    where: { id: decodedPayload.id },
  });

  if (!guest) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }

  const now = new Date();
  const accessExpiresISO = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  );
  const refreshExpiresISO = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  const accessToken = jwt.sign(
    {
      type: decodedPayload.type,
      id: decodedPayload.id,
      session_id: decodedPayload.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: decodedPayload.type,
      id: decodedPayload.id,
      session_id: decodedPayload.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Because session table is not loaded, skip updating expired_at in session

  return {
    id: guest.id,
    nickname: guest.nickname,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at:
      guest.deleted_at === null ? undefined : toISOStringSafe(guest.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresISO,
      refreshable_until: refreshExpiresISO,
    },
  };
}
