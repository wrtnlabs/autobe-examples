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

export async function postAuthUserLogin(props: {
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorized> {
  // Find user by email
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });

  // Verify user exists and password matches
  if (
    !user ||
    !(await PasswordUtil.verify(props.body.password, user.password_hash))
  ) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Generate access token
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h" },
  );

  // Generate refresh token
  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d" },
  );

  // Calculate expiration times
  const now = new Date();
  const expiredAt = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Return authorized user with token information
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(expiredAt),
      refreshable_until: toISOStringSafe(refreshableUntil),
    } satisfies IAuthorizationToken,
  } satisfies ITodoListUser.IAuthorized;
}
