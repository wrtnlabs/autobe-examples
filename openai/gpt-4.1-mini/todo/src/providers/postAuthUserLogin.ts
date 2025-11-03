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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postAuthUserLogin(props: {
  user: UserPayload;
  body: ITodoUser.ILogin;
}): Promise<ITodoUser.IAuthorized> {
  const { body } = props;

  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isValid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const now = toISOStringSafe(new Date());
  const accessExpiration = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiration = toISOStringSafe(
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
      expired_at: accessExpiration,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
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
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiration,
    refreshable_until: refreshExpiration,
  };

  return {
    id: user.id,
    token,
  };
}
