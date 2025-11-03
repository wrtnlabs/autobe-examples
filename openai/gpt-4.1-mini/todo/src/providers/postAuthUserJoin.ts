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

export async function postAuthUserJoin(props: {
  user: UserPayload;
  body: ITodoUser.ICreate;
}): Promise<ITodoUser.IAuthorized> {
  const existingUser = await MyGlobal.prisma.todo_users.findFirst({
    where: { email: props.body.email },
  });
  if (existingUser !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const nowIso = toISOStringSafe(new Date());

  const createdUser = await MyGlobal.prisma.todo_users.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: nowIso,
      updated_at: nowIso,
    },
  });

  const session = await MyGlobal.prisma.todo_user_sessions.create({
    data: {
      id: v4(),
      todo_user_id: createdUser.id,
      created_at: nowIso,
      expired_at: null,
      ip: "",
      href: "",
      referrer: "",
    },
  });

  const accessExpireIso = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpireIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const accessToken = jwt.sign(
    {
      type: "user",
      id: createdUser.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: "user",
      id: createdUser.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: createdUser.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireIso,
      refreshable_until: refreshExpireIso,
    },
  };
}
