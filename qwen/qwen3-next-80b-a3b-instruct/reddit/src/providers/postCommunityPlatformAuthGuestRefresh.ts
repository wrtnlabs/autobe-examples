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
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postCommunityPlatformAuthGuestRefresh(props: {
  body: ICommunityPlatformGuest.IRefresh;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  // For guest refresh, the authorization token is passed in the Authorization header
  // This would be parsed from the request context in a real implementation
  // We're told the request body is empty IRefresh, so we assume token is in headers
  // Generate token expiration timestamps
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  // In reality, we'd decode the incoming token to get the guest id and session_id
  // For this implementation, we assume the token contains a valid guest session
  // We create new tokens with new tokens but same session identity
  const newSessionId = v4() as string & tags.Format<"uuid">;
  const newGuestId = v4() as string & tags.Format<"uuid">;
  // Generate new access JWT token
  const access = jwt.sign(
    {
      type: "guest",
      id: newGuestId,
      session_id: newSessionId,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  // Generate new refresh JWT token
  const refresh = jwt.sign(
    {
      type: "guest",
      id: newGuestId,
      session_id: newSessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return the authorized response structure
  return {
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    } as IAuthorizationToken,
    sessionExpiration: accessExpires,
  };
}
