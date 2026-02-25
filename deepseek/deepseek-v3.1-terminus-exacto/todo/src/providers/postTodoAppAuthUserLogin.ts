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

export async function postTodoAppAuthUserLogin(props: {
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  // 1. Find user by email with password_hash
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null, // Only active users can login
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 2. Validate user exists - generic error per analysis requirements
  if (!user) {
    throw new HttpException("Invalid email or password", 401);
  }
  // 3. Verify password using PasswordUtil.verify()
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid email or password", 401);
  }
  // 4. Create new session (without storing tokens in DB)
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionId = v4();
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: sessionId,
      todo_app_user_id: user.id,
      ip: "", // IP not provided in props - using empty string as placeholder
      href: "", // URL not provided in props
      referrer: "", // Referrer not provided in props
      created_at: now,
      expired_at: accessExpiresAt,
      access_token: "", // Placeholder - JWT tokens stored client-side
      refresh_token: "", // Placeholder - JWT tokens stored client-side
    },
  });
  // 5. Generate JWT tokens
  const jwtPayload = {
    type: "user",
    id: user.id,
    session_id: session.id,
    created_at: now.toISOString(),
  };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...jwtPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Construct response with proper type safety
  const response: ITodoAppUser.IAuthorized = {
    id: typia.assert<ITodoAppUser.IAuthorized["id"]>(user.id),
    email: typia.assert<ITodoAppUser.IAuthorized["email"]>(user.email),
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(user.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: user.deleted_at
      ? (toISOStringSafe(user.deleted_at) as string & tags.Format<"date-time">)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: typia.assert<IAuthorizationToken["expired_at"]>(
        accessExpiresAt.toISOString(),
      ),
      refreshable_until: typia.assert<IAuthorizationToken["refreshable_until"]>(
        refreshExpiresAt.toISOString(),
      ),
    },
  };
  return response;
}
