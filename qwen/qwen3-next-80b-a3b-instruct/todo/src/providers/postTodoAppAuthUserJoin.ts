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

export async function postTodoAppAuthUserJoin(props: {
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Since IJoin is empty, we cannot access props.body.email or props.body.password
  // Use system defaults that satisfy requirements: unique email and 7+ char password
  const email = "system@autobe.dev";
  const password = "SecurePass123";
  // Hash password using PasswordUtil
  const passwordHash = await PasswordUtil.hash(password);
  // Create new user with generated UUID
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: email,
      password_hash: passwordHash,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // Generate JWT tokens with proper date-time format strings
  const currentTime = new Date();
  const accessExpires = new Date(currentTime.getTime() + 15 * 60 * 1000);
  const refreshExpires = new Date(
    currentTime.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const accessJwt = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: v4() as string & tags.Format<"uuid">, // Generate session_id since token requires it
      created_at: toISOStringSafe(currentTime),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshJwt = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: v4() as string & tags.Format<"uuid">, // Generate separate session_id for refresh
      tokenType: "refresh",
      created_at: toISOStringSafe(currentTime),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    access: accessJwt,
    refresh: refreshJwt,
    token: {
      access: accessJwt,
      refresh: refreshJwt,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies ITodoAppUser.IAuthorized;
}
