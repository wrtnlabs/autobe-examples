import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserListUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ITodoListUserListUser.ILogin;
}): Promise<ITodoListUserListUser.IAuthorized> {
  // 1. Find user by email
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Verify password
  const isValid = await PasswordUtil.verify(props.body.password, user.password);

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Create new session
  const now = new Date();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: user.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: toISOStringSafe(now),
      expired_at: accessExpires,
    },
  });

  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "user",
        id: user.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // 5. Return authorized user information
  return {
    id: user.id,
    email: user.email,
    token,
  };
}
