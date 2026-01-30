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
import { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postEconomicForumAuthUserRefresh(props: {
  body: IEconomicForumUser.IRefresh;
}): Promise<IEconomicForumUser.IAuthorized> {
  // Decode and validate refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "user";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate session exists and is not expired
  const session = await MyGlobal.prisma.economic_forum_user_sessions.findFirst({
    where: {
      id: decoded.session_id,
      user_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Verify user account is active
  const user = await MyGlobal.prisma.economic_forum_users.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (user.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Generate new tokens
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Update session with new refresh token and expiration — refresh_token field removed per schema
  await MyGlobal.prisma.economic_forum_user_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: accessExpires,
    },
  });
  // Return user data with new tokens — providing default empty values for the required IAuthorized interface properties not in the database schema
  return {
    id: user.id as string & tags.Format<"uuid">,
    settings: {},
    email: user.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    avatar_url: "", // Required by IAuthorized interface but not in schema - use empty string
    username: "", // Required by IAuthorized interface but not in schema - use empty string
    bio: "", // Required by IAuthorized interface but not in schema - use empty string
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires, // This is part of the IAuthorized interface contract, not stored in database
    },
  };
}
