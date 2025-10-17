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

export async function postAuthGuestJoin(): Promise<IDiscussionBoardGuest.IAuthorized> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const id: string & tags.Format<"uuid"> = v4();

  // Generate a random anonymous_token (length 32 alphanumeric)
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let anonymous_token = "";
  for (let i = 0; i < 32; ++i) {
    anonymous_token += chars[Math.floor(Math.random() * chars.length)];
  }

  await MyGlobal.prisma.discussion_board_guests.create({
    data: {
      id,
      anonymous_token,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const access = jwt.sign({ id, type: "guest" }, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { id, type: "guest", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id,
    anonymous_token,
    token: {
      access,
      refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
