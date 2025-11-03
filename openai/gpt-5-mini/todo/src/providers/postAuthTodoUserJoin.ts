import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoUserJoin(props: {
  body: ITodoAppTodoUser.ICreate;
}): Promise<ITodoAppTodoUser.IAuthorized> {
  const { body } = props;

  // Duplicate email check
  const existing = await MyGlobal.prisma.todo_app_todouser.findFirst({
    where: { email: body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);

  // Hash the provided password
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Prepare identifiers and timestamps
  const userId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  try {
    const { createdUser, createdSession } = await MyGlobal.prisma.$transaction(
      async (tx) => {
        const createdUser = await tx.todo_app_todouser.create({
          data: {
            id: userId,
            email: body.email,
            password_hash: hashedPassword,
            display_name: body.displayName ?? null,
            is_verified: false,
            status: "pending_verification",
            failed_login_attempts: 0,
            mfa_enabled: false,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });

        const createdSession = await tx.todo_app_todouser_sessions.create({
          data: {
            id: sessionId,
            todo_app_todouser_id: createdUser.id,
            ip: body.ip ?? "",
            href: body.href,
            referrer: body.referrer,
            created_at: now,
            expired_at: accessExpires,
          },
        });

        return { createdUser, createdSession };
      },
    );

    const accessToken = jwt.sign(
      {
        type: "todouser",
        id: createdUser.id,
        session_id: createdSession.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    );

    const refreshToken = jwt.sign(
      {
        type: "todouser",
        id: createdUser.id,
        session_id: createdSession.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );

    const token = {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    } satisfies IAuthorizationToken;

    return {
      id: createdUser.id,
      email: createdUser.email,
      display_name: createdUser.display_name ?? null,
      is_verified: createdUser.is_verified,
      status: createdUser.status,
      mfa_enabled: createdUser.mfa_enabled,
      createdAt: toISOStringSafe(createdUser.created_at),
      updatedAt: toISOStringSafe(createdUser.updated_at),
      deletedAt: createdUser.deleted_at
        ? toISOStringSafe(createdUser.deleted_at)
        : null,
      token,
    } satisfies ITodoAppTodoUser.IAuthorized;
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new HttpException("Internal Server Error", 500);
  }
}
