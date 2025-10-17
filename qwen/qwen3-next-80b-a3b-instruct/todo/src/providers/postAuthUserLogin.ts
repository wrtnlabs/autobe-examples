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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserLogin(props: {
  user: UserPayload;
}): Promise<ITodoListUser.IAuthorized> {
  // Verify user exists in the database using the provided user ID
  const user = await MyGlobal.prisma.todo_list_user.findFirst({
    where: {
      id: props.user.id,
    },
  });

  // If user doesn't exist, throw a not found error
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Generate access token with expiration in 1 hour
  const accessToken = jwt.sign(
    {
      id: props.user.id,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate refresh token with expiration in 7 days
  const refreshToken = jwt.sign(
    {
      id: props.user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return the authorized user object with JWT tokens and expiration times
  return {
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)), // 1 hour from now
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ), // 7 days from now
    },
  };
}
