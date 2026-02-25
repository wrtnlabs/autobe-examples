import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthUserLogin(props: {
  body: IMultiUserTodoUser.ILogin;
}): Promise<IMultiUserTodoUser.IAuthorized> {
  const user = await MyGlobal.prisma.multi_user_todo_users.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      display_name: true,
      password_hash: true,
    },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = toISOStringSafe(new Date());
  const accessExpiresMs = 60 * 60 * 1000;
  const accessExpires = toISOStringSafe(new Date(Date.now() + accessExpiresMs));
  const refreshExpiresMs = 7 * 24 * 60 * 60 * 1000;
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + refreshExpiresMs),
  );
  const sessionId = v4();
  const session = await MyGlobal.prisma.multi_user_todo_user_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_user_id: user.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">,
      updated_at: now satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">,
      expired_at: accessExpires satisfies string &
        tags.Format<"date-time"> as string & tags.Format<"date-time">,
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
    expired_at: accessExpires,
    refreshable_until: refreshableUntil,
  };
  return {
    id: user.id,
    displayName: user.display_name,
    token,
  };
}
