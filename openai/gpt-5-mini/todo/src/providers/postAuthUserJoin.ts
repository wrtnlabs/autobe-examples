import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserJoin(props: {
  body: ITodoAppUser.ICreate;
}): Promise<ITodoAppUser.IAuthorized> {
  const { body } = props;

  // Check for existing account with same email
  const existing = await MyGlobal.prisma.todo_app_user.findUnique({
    where: { email: body.email },
  });
  if (existing) {
    throw new HttpException("Conflict: Email already registered", 409);
  }

  // Hash the plaintext password
  const password_hash = await PasswordUtil.hash(body.password);

  // Prepare shared values
  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Prepare token expiry timestamps
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  // Create user record (inline data object to preserve type errors clarity)
  const created = await MyGlobal.prisma.todo_app_user.create({
    data: {
      id,
      email: body.email,
      display_name: body.display_name ?? null,
      password_hash,
      account_status: "active",
      created_at: now,
      updated_at: now,
    },
  });

  // Generate JWT tokens
  const access = jwt.sign(
    { userId: created.id, email: created.email },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    { userId: created.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Build authorized response
  return {
    id: created.id as string & tags.Format<"uuid">,
    email: created.email,
    display_name: created.display_name ?? null,
    account_status: created.account_status,
    created_at: created.created_at ? toISOStringSafe(created.created_at) : now,
    updated_at: created.updated_at ? toISOStringSafe(created.updated_at) : now,
    last_active_at: created.last_active_at
      ? toISOStringSafe(created.last_active_at)
      : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
    user: {
      id: created.id as string & tags.Format<"uuid">,
      email: created.email,
      display_name: created.display_name ?? null,
      account_status: created.account_status,
      created_at: created.created_at
        ? toISOStringSafe(created.created_at)
        : now,
      last_active_at: created.last_active_at
        ? toISOStringSafe(created.last_active_at)
        : null,
    },
  };
}
