import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";

export async function postAuthUserJoin(props: {
  body: ITodoListUser.ICreate;
}): Promise<ITodoListUser.IAuthorized> {
  const existing = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const user_id = v4();
  const session_id = v4();
  const user = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id: user_id,
      email: props.body.email,
      password_hash: password_hash,
      created_at: now,
      updated_at: now,
    },
  });
  const access_exp = new Date(Date.now() + 60 * 60 * 1000);
  const refresh_exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionData: any = {
    id: session_id,
    todo_list_user_id: user.id,
    href: props.body.href,
    referrer: props.body.referrer,
    created_at: now,
    expired_at: toISOStringSafe(access_exp),
  };
  if (props.body.ip != null) {
    sessionData.ip = props.body.ip satisfies string as string;
  }
  const session = await MyGlobal.prisma.todo_list_user_sessions.create({
    data: sessionData,
  });
  const access = jwt.sign(
    { type: "user", id: user.id, session_id: session.id, created_at: now },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: access,
      refresh: refresh,
      expired_at: toISOStringSafe(access_exp),
      refreshable_until: toISOStringSafe(refresh_exp),
    },
  };
}
