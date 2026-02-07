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
  // Check for duplicate email
  const existing = await MyGlobal.prisma.todo_app_users.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // Create user record with hashed password
  const userId = v4();
  const currentTime = toISOStringSafe(new Date());
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const user = await MyGlobal.prisma.todo_app_users.create({
    data: {
      id: userId,
      email: props.body.email,
      password_hash: hashedPassword,
      display_name: props.body.display_name,
      created_at: currentTime,
      updated_at: currentTime,
      deleted_at: null,
    },
  });
  // Create session record - using default values since request context not available
  const sessionId = v4();
  const accessExpiresTime = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresTime = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: sessionId,
      todo_app_user_id: userId,
      access_token: "token_placeholder", // Will be replaced
      refresh_token: "refresh_placeholder", // Will be replaced
      ip: "0.0.0.0", // Default IP since not in request context
      href: "", // Default URL
      referrer: "", // Default referrer
      created_at: currentTime,
      expired_at: accessExpiresTime,
    },
  });
  // Generate JWT tokens
  const tokenPayload = {
    type: "user",
    id: userId,
    session_id: sessionId,
    created_at: currentTime,
  };
  const token = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      { ...tokenPayload, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresTime,
    refreshable_until: refreshExpiresTime,
  };
  // Update session with actual tokens
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
    },
  });
  // Return authorized response with proper typing
  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token,
  } satisfies ITodoAppUser.IAuthorized;
}
