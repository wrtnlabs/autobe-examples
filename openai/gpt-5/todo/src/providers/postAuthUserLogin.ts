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

export async function postAuthUserLogin(props: {
  body: ITodoUser.ILogin;
}): Promise<ITodoUser.IAuthorized> {
  const { body } = props;

  // Phase 1: Validate actor credentials
  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: body.email },
  });

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  if (!user) {
    // Audit failure: user not found
    await MyGlobal.prisma.todo_audit_events.create({
      data: {
        id: v4(),
        actor_type: "user",
        category: "auth",
        action: "login",
        success: false,
        message: "Invalid credentials",
        ip: body.ip ?? null,
        href: body.href,
        referrer: body.referrer,
        created_at: now,
        updated_at: now,
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  const valid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!valid) {
    // Audit failure: password mismatch
    await MyGlobal.prisma.todo_audit_events.create({
      data: {
        id: v4(),
        todo_user_id: user.id,
        actor_type: "user",
        category: "auth",
        action: "login",
        success: false,
        message: "Invalid credentials",
        ip: body.ip ?? null,
        href: body.href,
        referrer: body.referrer,
        resource_type: "user",
        resource_id: user.id,
        created_at: now,
        updated_at: now,
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  // Optional policy: reflect account activity
  await MyGlobal.prisma.todo_users.update({
    where: { id: user.id },
    data: {
      updated_at: now,
    },
  });

  // Phase 2: Create session
  const accessExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshUntil: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: v4(),
      todo_user_id: user.id,
      ip: body.ip ?? "",
      href: body.href,
      referrer: body.referrer,
      created_at: now,
      expired_at: accessExpiredAt,
    },
  });

  // Audit success
  await MyGlobal.prisma.todo_audit_events.create({
    data: {
      id: v4(),
      todo_user_id: user.id,
      todo_user_session_id: session.id,
      actor_type: "user",
      category: "auth",
      action: "login",
      success: true,
      ip: body.ip ?? null,
      href: body.href,
      referrer: body.referrer,
      resource_type: "user",
      resource_id: user.id,
      created_at: now,
      updated_at: now,
    },
  });

  // Phase 3: JWT token generation
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshUntil,
  };

  return {
    id: user.id as string & tags.Format<"uuid">,
    email: user.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(user.created_at),
    updated_at: now,
    token,
  };
}
