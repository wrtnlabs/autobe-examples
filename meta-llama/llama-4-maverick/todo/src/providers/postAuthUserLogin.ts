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
  ip: string;
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorized> {
  // Find user by username
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { username: props.body.username },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Create new session
  const accessExpires = new Date(
    Date.now() + (MyGlobal.env as any).ACCESS_TOKEN_EXPIRES_IN * 1000,
  );
  const refreshExpires = new Date(
    Date.now() + (MyGlobal.env as any).REFRESH_TOKEN_EXPIRES_IN * 1000,
  );
  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: user.id,
      ip: props.ip,
      href: "/",
      referrer: "/",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      (MyGlobal.env as any).JWT_SECRET_KEY as string,
      {
        expiresIn: (MyGlobal.env as any).ACCESS_TOKEN_EXPIRES_IN,
        issuer: "autobe",
      },
    ) as string,
    refresh: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      (MyGlobal.env as any).JWT_SECRET_KEY as string,
      {
        expiresIn: (MyGlobal.env as any).REFRESH_TOKEN_EXPIRES_IN,
        issuer: "autobe",
      },
    ) as string,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return authorized response
  return {
    id: user.id,
    token,
  };
}
