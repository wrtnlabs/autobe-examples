import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoUser.IJoin;
}): Promise<ITodoUser.IAuthorized> {
  const { body } = props;

  // Business rule: unique email
  const existing = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: body.email },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  const now = toISOStringSafe(new Date());
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const userId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;

  const passwordHash = await PasswordUtil.hash(body.password);
  const ip = body.ip ?? "";

  try {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.todo_users.create({
        data: {
          id: userId,
          email: body.email,
          password_hash: passwordHash,
          created_at: now,
          updated_at: now,
        },
      });

      await tx.todo_user_sessions.create({
        data: {
          id: sessionId,
          todo_user_id: userId,
          ip,
          href: body.href,
          referrer: body.referrer,
          created_at: now,
          expired_at: accessExpiresIso,
        },
      });

      await tx.todo_audit_events.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_user_id: userId,
          todo_user_session_id: sessionId,
          actor_type: "user",
          category: "auth",
          action: "register",
          success: true,
          message: "User registration completed",
          ip: ip || undefined,
          href: body.href,
          referrer: body.referrer,
          created_at: now,
          updated_at: now,
        },
      });
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Email already registered", 409);
    }
    throw err;
  }

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: userId,
        session_id: sessionId,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: userId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  return {
    id: userId,
    email: body.email,
    created_at: now,
    updated_at: now,
    token,
  };
}
