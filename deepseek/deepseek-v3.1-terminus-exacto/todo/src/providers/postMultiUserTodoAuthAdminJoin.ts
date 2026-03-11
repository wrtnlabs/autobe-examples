import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoAdminTransformer } from "../transformers/MultiUserTodoAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthAdminJoin(props: {
  ip: string;
  body: IMultiUserTodoAdmin.IJoin;
}): Promise<IMultiUserTodoAdmin.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.multi_user_todo_admins.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // 2. Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);
  // 3. Create admin record
  const adminId = v4() as string & tags.Format<"uuid">;
  const now = new Date().toISOString();
  const admin = await MyGlobal.prisma.multi_user_todo_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash,
      display_name: props.body.display_name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...MultiUserTodoAdminTransformer.select(),
  });
  // 4. Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const session = await MyGlobal.prisma.multi_user_todo_admin_sessions.create({
    data: {
      id: sessionId,
      multi_user_todo_admin_id: adminId,
      access_token: "", // Will be set by JWT
      refresh_token: "", // Will be set by JWT
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
    select: {
      id: true,
      created_at: true,
      expired_at: true,
    },
  });
  // 5. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: adminId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with tokens
  await MyGlobal.prisma.multi_user_todo_admin_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 6. Return transformed admin with token
  const adminTransformed = await MultiUserTodoAdminTransformer.transform(admin);
  return {
    ...adminTransformed,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IMultiUserTodoAdmin.IAuthorized;
}
