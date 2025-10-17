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

export async function postAuthUserJoin(props: {
  user: UserPayload;
}): Promise<ITodoListUser.IAuthorized> {
  // The system is designed as a single-user application with no authentication
  // credentials. The UserPayload.id is provided from context and must be used
  // directly as the todo_list_user.id.

  // The Prisma schema shows todo_list_user has only id, created_at, updated_at
  // fields. No email, password, or username fields exist.

  // Generate current ISO string using toISOStringSafe with Date constructed
  // from system time (this is the only acceptable way to get current time)
  const now = toISOStringSafe(new Date());

  // Create the user in the todo_list_user table using provided user.id
  const newUser = await MyGlobal.prisma.todo_list_user.create({
    data: {
      id: props.user.id,
      created_at: now,
      updated_at: now,
    },
  });

  // Create token expiration times using Date constructor and then toISOStringSafe
  // This is the only permitted way to derive date strings within the system rules
  const accessTokenExpires = toISOStringSafe(new Date(Date.now() + 3600000)); // 1 hour
  const refreshTokenExpires = toISOStringSafe(new Date(Date.now() + 604800000)); // 7 days

  // Generate access token
  const accessToken = jwt.sign(
    {
      userId: newUser.id,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      userId: newUser.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return the authorized user object with the token - all date fields properly formatted
  return {
    id: newUser.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpires,
      refreshable_until: refreshTokenExpires,
    },
  };
}
