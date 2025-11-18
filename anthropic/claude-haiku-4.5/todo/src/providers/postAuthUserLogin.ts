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
  body: ITodoListUser.ILogin;
}): Promise<ITodoListUser.IAuthorized> {
  // Step 1: Retrieve user by unique email
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email: props.body.email },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Step 2: Verify plain password against secure hash
  const passwordOk = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!passwordOk) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Step 3: Create session record in audit table
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  await MyGlobal.prisma.todo_list_user_sessions.create({
    data: {
      id: sessionId,
      todo_list_user_id: user.id,
      ip:
        props.body.ip === null || props.body.ip === undefined
          ? ""
          : (props.body.ip satisfies string as string),
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: null,
    },
  });

  // Step 4: Generate JWT tokens
  const access = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 5: Return per IAuthorized contract
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    token: {
      access,
      refresh,
      expired_at: accessExpire,
      refreshable_until: refreshExpire,
    },
  };
}
