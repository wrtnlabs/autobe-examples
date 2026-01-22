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
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";

export async function postAuthUserRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  const { token } = props.body;
  // Decode JWT token to extract user and session information
  let decoded: {
    id: string;
    session_id: string;
    type: "user";
  };
  try {
    decoded = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "user";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate type matches expected actor type
  if (decoded.type !== "user") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate token exists in todo_list_tokens table and is not revoked
  const tokenRecord = await MyGlobal.prisma.todo_list_tokens.findFirst({
    where: {
      id: decoded.session_id,
      token_value: token,
      revoked_at: null,
    },
    select: {
      id: true,
      created_at: true,
      expires_at: true,
    },
  });
  if (!tokenRecord) {
    throw new HttpException("Token not found or has been revoked", 401);
  }
  // Check if token has expired
  const now = new Date();
  if (new Date(tokenRecord.expires_at) < now) {
    throw new HttpException("Token has expired", 401);
  }
  // Extract user data using decoded ID directly (no relation possible)
  const user = await MyGlobal.prisma.todo_list_user.findUnique({
    where: {
      id: decoded.id,
    },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Generate new tokens
  const accessTokenExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshTokenExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days
  const accessToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Update token record on refresh
  await MyGlobal.prisma.todo_list_tokens.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      revoked_at: toISOStringSafe(now),
    },
  });
  // Create new token record with new refresh token
  const newTokenId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.todo_list_tokens.create({
    data: {
      id: newTokenId,
      token_value: refreshToken,
      expires_at: refreshTokenExpires,
      created_at: toISOStringSafe(now),
      revoked_at: null,
    },
  });
  // Return authorized response in required format
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email,
    createdAt: toISOStringSafe(user.created_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpires,
      refreshable_until: refreshTokenExpires,
    },
  };
}
