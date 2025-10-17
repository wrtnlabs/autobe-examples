import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserRefresh(props: {
  body: ITodoListUser.IRefresh;
}): Promise<ITodoListUser.IAuthorized> {
  // Verify and decode the refresh token
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as jwt.JwtPayload;

    // Verify token type is refresh
    if (decoded.tokenType !== "refresh") {
      throw new HttpException("Invalid token type", 400);
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      if (error.name === "TokenExpiredError") {
        throw new HttpException("Refresh token expired", 401);
      }
      throw new HttpException("Invalid refresh token", 401);
    }
    throw error;
  }

  // Get user data from database
  let user: Prisma.todo_list_usersGetPayload<{}> | null;
  try {
    user = await MyGlobal.prisma.todo_list_users.findUnique({
      where: { id: decoded.userId },
    });
  } catch (error) {
    throw new HttpException("Database error", 500);
  }

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Check if user is soft-deleted
  if (user.deleted_at) {
    throw new HttpException("User account deleted", 403);
  }

  // Generate new access token
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate new refresh token
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiration times
  const now = new Date();
  const expiredAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // Return authorized response
  return {
    id: user.id satisfies string as string,
    email: user.email satisfies string as string,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(expiredAt),
      refreshable_until: toISOStringSafe(refreshableUntil),
    },
  };
}
