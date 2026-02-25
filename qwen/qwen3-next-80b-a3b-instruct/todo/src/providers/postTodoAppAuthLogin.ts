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

export async function postTodoAppAuthLogin(props: {
  ip: string;
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  // 1. Find user with password_hash
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true, // Explicitly include for verification
      created_at: true,
      updated_at: true,
    },
  });
  if (!user) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 20 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4(),
      todo_app_user_id: user.id,
      ip: props.ip ?? "",
      href: "", // Required field in Prisma schema, default empty string
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(refreshExpires),
    },
  });
  // 4. Generate JWT tokens
  const accessTokenPayload = {
    sub: user.id satisfies string as string & tags.Format<"uuid">,
    role: "member" as const,
    permissions: [
      "read:todos",
      "write:todos",
      "delete:todos",
      "read:profile",
      "write:profile",
      "delete:profile",
      "read:history",
      "write:history",
      "read:trash",
      "write:trash",
    ] as const,
    iat: now.getTime() / 1000,
    exp: accessExpires.getTime() / 1000,
  };
  const refreshTokenPayload = {
    ...accessTokenPayload,
    tokenType: "refresh" as const,
    exp: refreshExpires.getTime() / 1000,
  };
  const accessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  // 5. Return IAuthorized
  return {
    id: user.id satisfies string as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies ITodoAppUser.IAuthorized;
}
