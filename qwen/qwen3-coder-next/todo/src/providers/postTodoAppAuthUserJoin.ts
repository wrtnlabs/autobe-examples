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
  ip: string;
  body: ITodoAppUser.IJoin;
}): Promise<ITodoAppUser.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);
  // Create user record
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    select: {
      id: true,
      email: true,
    },
  });
  // Create session record
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_user_id: user.id,
      href: "", // Required field from schema
      referrer: "", // Required field from schema
      ip: props.ip,
      expired_at: accessExpires.toISOString(),
      created_at: new Date().toISOString(),
    },
    select: {
      id: true,
    },
  });
  // Generate JWT tokens
  const access = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // Return authorized response
  return {
    id: user.id,
    email: user.email,
    token: {
      access,
      refresh,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  } satisfies ITodoAppUser.IAuthorized;
}
