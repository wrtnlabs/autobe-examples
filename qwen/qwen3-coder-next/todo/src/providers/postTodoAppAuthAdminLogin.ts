import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthAdminLogin(props: {
  body: ITodoAppAdminSession.ILogin;
}): Promise<ITodoAppAdminSession.IAuthorized> {
  // 1. Find admin with explicit password_hash selection
  const admin = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
    },
  });
  if (!admin) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Calculate expiration times as string & Format<'date-time'>
  const now = new Date();
  const accessExpiresTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessExpires = toISOStringSafe(accessExpiresTime);
  const refreshExpires = toISOStringSafe(refreshExpiresTime);
  // 4. Generate JWT tokens using toISOStringSafe for proper datetime format
  const tokenPayload = {
    type: "admin" as const,
    id: admin.id as string & tags.Format<"uuid">,
    session_id: v4() as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    {
      ...tokenPayload,
      tokenType: "refresh" as const,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Create session with all fields including tokens in one operation
  const session = await MyGlobal.prisma.todo_app_admin_sessions.create({
    data: {
      id: tokenPayload.session_id,
      admin_id: admin.id as string & tags.Format<"uuid">,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
      updated_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
      expires_at: accessExpires as string & tags.Format<"date-time">,
      deleted_at: null,
      access_token: access,
      refresh_token: refresh,
    },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
    },
  });
  // 6. Return authorized response with properly typed values
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    token: {
      access,
      refresh,
      expired_at: accessExpires as string & tags.Format<"date-time">,
      refreshable_until: refreshExpires as string & tags.Format<"date-time">,
    },
  } satisfies ITodoAppAdminSession.IAuthorized;
}
