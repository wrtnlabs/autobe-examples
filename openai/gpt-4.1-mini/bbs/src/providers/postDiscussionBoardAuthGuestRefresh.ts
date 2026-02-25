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
  let decodedToken: {
    type: string;
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    tokenType?: string;
    created_at?: string & tags.Format<"date-time">;
  };
  try {
    const verified = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (
      typeof verified !== "object" ||
      verified === null ||
      Array.isArray(verified)
    ) {
      throw new HttpException("Invalid token payload", 401);
    }
    // Extract and validate necessary properties with runtime checks
    const typeRaw = (verified as any)["type"];
    const idRaw = (verified as any)["id"];
    const sessionIdRaw = (verified as any)["session_id"];
    const tokenTypeRaw = (verified as any)["tokenType"];
    const createdAtRaw = (verified as any)["created_at"];
    if (typeof typeRaw !== "string")
      throw new HttpException("Invalid token payload: type", 401);
    if (typeof idRaw !== "string")
      throw new HttpException("Invalid token payload: id", 401);
    if (typeof sessionIdRaw !== "string")
      throw new HttpException("Invalid token payload: session_id", 401);
    const createdAtVal =
      createdAtRaw instanceof Date
        ? toISOStringSafe(createdAtRaw)
        : typeof createdAtRaw === "string"
          ? createdAtRaw
          : undefined;
    decodedToken = {
      type: typeRaw,
      id: idRaw as string & tags.Format<"uuid">,
      session_id: sessionIdRaw as string & tags.Format<"uuid">,
      tokenType: typeof tokenTypeRaw === "string" ? tokenTypeRaw : undefined,
      created_at: createdAtVal as
        | (string & tags.Format<"date-time">)
        | undefined,
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decodedToken.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  const { id, session_id } = decodedToken;
  const session =
    await MyGlobal.prisma.discussion_board_guest_sessions.findFirst({
      where: { id: session_id, discussion_board_guest_id: id },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest = await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow(
    {
      where: { id },
    },
  );
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const currentTimeISO = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const accessExpireISO = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpireISO = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const accessToken = jwt.sign(
    { type: "guest", id, session_id, created_at: currentTimeISO },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id,
      session_id,
      tokenType: "refresh",
      created_at: currentTimeISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.discussion_board_guest_sessions.update({
    where: { id: session_id },
    data: { expired_at: refreshExpireISO },
  });
  return {
    id: guest.id,
    deviceFingerprint: guest.device_fingerprint,
    userAgent: guest.user_agent,
    ipAddress: guest.ip_address,
    anonymousId: guest.anonymous_id,
    createdAt: toISOStringSafe(guest.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(guest.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      guest.deleted_at !== null
        ? (toISOStringSafe(guest.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireISO,
      refreshable_until: refreshExpireISO,
    },
  };
}
