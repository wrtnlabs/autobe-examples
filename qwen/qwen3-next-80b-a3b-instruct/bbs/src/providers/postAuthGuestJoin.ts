import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(): Promise<IEconomicBoardGuest.IAuthorized> {
  // Generate a new unique guest identifier
  const id: string & tags.Format<"uuid"> = v4();

  // Create a unique session ID for persistent guest state
  const session_id: string = v4();

  // Record the current timestamp as ISO string in UTC
  const nowString: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  // Record the last active timestamp
  const last_active: string & tags.Format<"date-time"> = nowString;

  // Insert the new guest into the database
  await MyGlobal.prisma.economic_board_guest.create({
    data: {
      id,
      session_id,
      created_at: nowString,
      last_active,
    },
  });

  // Generate an access token for the guest session
  // Token payload structure following the EE-Auth specification
  const accessToken = jwt.sign(
    {
      id,
      type: "guest" as const,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate a refresh token with longer expiration
  const refreshToken = jwt.sign(
    {
      id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate token expirations using toISOStringSafe(new Date())
  const expired_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 3600000),
  ); // 1 hour from now
  const refreshable_until: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 604800000),
  ); // 7 days from now

  // Return the authorized guest response
  return {
    id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
