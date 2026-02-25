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

export async function postDiscussionBoardAuthGuestJoin(props: {
  body: IDiscussionBoardGuest.IJoin;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  // Generate UUID for guest ID with proper type
  const guestId: string & tags.Format<"uuid"> = v4();
  // Get current date-time in ISO string format for createdAt and updatedAt
  const nowISO: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Calculate expiration timestamps for tokens
  const accessExpiresMS = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMS = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessExpiresISO: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpiresMS),
  );
  const refreshExpiresISO: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiresMS),
  );
  // Create new guest record in the database
  const guestRecord = await MyGlobal.prisma.discussion_board_guests.create({
    data: {
      id: guestId,
      device_fingerprint: props.body.deviceFingerprint,
      user_agent: props.body.userAgent,
      ip_address: props.body.ipAddress,
      anonymous_id: props.body.anonymousId,
      created_at: nowISO,
      updated_at: nowISO,
      deleted_at: null,
    },
  });
  // Generate access token
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: guestId,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: guestId,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Compose authorization token object
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresISO,
    refreshable_until: refreshExpiresISO,
  };
  // Return response matching IDiscussionBoardGuest.IAuthorized
  return {
    id: guestRecord.id,
    deviceFingerprint: guestRecord.device_fingerprint,
    userAgent: guestRecord.user_agent,
    ipAddress: guestRecord.ip_address,
    anonymousId: guestRecord.anonymous_id,
    createdAt: toISOStringSafe(guestRecord.created_at),
    updatedAt: toISOStringSafe(guestRecord.updated_at),
    deletedAt:
      guestRecord.deleted_at !== null
        ? toISOStringSafe(guestRecord.deleted_at)
        : null,
    token,
  };
}
