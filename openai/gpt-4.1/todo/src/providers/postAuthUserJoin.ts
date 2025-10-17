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

export async function postAuthUserJoin(props: {
  body: ITodoListUser.IJoin;
}): Promise<ITodoListUser.IAuthorized> {
  const { email, password } = props.body;

  // 1. Enforce unique email
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // 2. Hash password
  const password_hash = await PasswordUtil.hash(password);

  // 3. Prepare id and timestamps
  const now = toISOStringSafe(new Date());
  // id must be uuid (schema requires manual id)
  const id = v4();

  // 4. Create user (last_login omitted - remains null)
  const created = await MyGlobal.prisma.todo_list_users.create({
    data: {
      id,
      email,
      password_hash,
      created_at: now,
      updated_at: now,
    },
  });

  // 5. JWT token generation and expiry calculations
  const payload = { id: created.id, type: "user" };
  const secret = MyGlobal.env.JWT_SECRET_KEY;

  const accessExpiresAtMillis = Date.now() + 60 * 60 * 1000;
  const refreshExpiresAtMillis = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const expired_at = toISOStringSafe(new Date(accessExpiresAtMillis));
  const refreshable_until = toISOStringSafe(new Date(refreshExpiresAtMillis));

  const access = jwt.sign(payload, secret, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, secret, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  return {
    id: created.id,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
