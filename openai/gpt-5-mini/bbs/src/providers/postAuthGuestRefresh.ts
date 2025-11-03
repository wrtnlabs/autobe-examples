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
  const { body } = props;

  // Verify and decode the refresh token
  let decodedPayload: unknown;
  try {
    decodedPayload = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (typeof decodedPayload !== "object" || decodedPayload === null) {
    throw new HttpException("Invalid token payload", 401);
  }

  const tokenData = decodedPayload as {
    id: string;
    session_id: string;
    type: string;
  };

  if (tokenData.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  // Validate guest existence and lifecycle state
  const guestRecord = await MyGlobal.prisma.discussion_board_guest.findFirst({
    where: { id: tokenData.id },
  });

  if (!guestRecord) {
    throw new HttpException("Guest not found", 404);
  }

  if (guestRecord.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Generate new tokens reusing the same session_id from token
  const createdAtIso = toISOStringSafe(new Date());
  const accessExpiryIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiryIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const accessToken = jwt.sign(
    {
      type: tokenData.type,
      id: tokenData.id,
      session_id: tokenData.session_id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: tokenData.type,
      id: tokenData.id,
      session_id: tokenData.session_id,
      tokenType: "refresh",
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Build response per IDiscussionBoardGuest.IAuthorized
  return {
    id: guestRecord.id,
    displayName: guestRecord.display_name ?? undefined,
    ip: null,
    createdAt: toISOStringSafe(guestRecord.created_at),
    updatedAt: toISOStringSafe(guestRecord.updated_at),
    deletedAt: guestRecord.deleted_at
      ? toISOStringSafe(guestRecord.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiryIso,
      refreshable_until: refreshExpiryIso,
    },
  };
}
