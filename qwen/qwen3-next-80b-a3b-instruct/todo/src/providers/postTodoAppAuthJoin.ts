import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthJoin(props: {
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Check if email already exists
  const existing = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // Create user with hashed password and generated UUID
  const now = new Date().toISOString();
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: now as string & tags.Format<"date-time">,
      updated_at: now as string & tags.Format<"date-time">,
    },
  });
  // Calculate token expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Generate JWT access token
  const access = jwt.sign(
    {
      sub: user.id,
      role: "member",
      iat: now,
      exp: accessExpires.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // Generate JWT refresh token
  const refresh = jwt.sign(
    {
      sub: user.id,
      iat: now,
      exp: refreshExpires.toISOString(),
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Return IAuthorized with token
  return {
    id: user.id,
    token: {
      access,
      refresh,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  } satisfies ITodoAppUser.IAuthorized;
}
