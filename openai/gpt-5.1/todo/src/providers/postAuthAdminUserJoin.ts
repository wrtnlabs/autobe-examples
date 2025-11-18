import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserJoin(props: {
  body: ITodoAppAdminUser.IJoin;
}): Promise<ITodoAppAdminUser.IAuthorized> {
  // Check for existing admin with same email
  const existing = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: { email: props.body.email },
  });

  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const nowDate = new Date();
  const nowIso = toISOStringSafe(nowDate);

  const adminId = v4() as string & tags.Format<"uuid">;

  // Create admin user
  let admin: Prisma.todo_app_adminusersUncheckedCreateInput & {
    id: string & tags.Format<"uuid">;
    last_login_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  };

  try {
    admin = (await MyGlobal.prisma.todo_app_adminusers.create({
      data: {
        id: adminId,
        email: props.body.email,
        password_hash: hashedPassword,
        display_name: props.body.display_name ?? null,
        status: "active",
        failed_login_count: 0,
        last_login_at: null,
        created_at: nowDate,
        updated_at: nowDate,
        deleted_at: null,
      },
    })) as typeof admin;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation on email
      throw new HttpException("Email already registered", 409);
    }
    throw error;
  }

  // Create session for admin user
  const sessionId = v4() as string & tags.Format<"uuid">;

  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const accessExpiresIso = toISOStringSafe(accessExpiresDate);
  const refreshExpiresIso = toISOStringSafe(refreshExpiresDate);

  const session = await MyGlobal.prisma.todo_app_adminuser_sessions.create({
    data: {
      id: sessionId,
      todo_app_adminuser_id: admin.id,
      // No IP/href/referrer come from props for this operation; use empty string defaults.
      ip: "",
      href: "",
      referrer: "",
      created_at: nowDate,
      expired_at: accessExpiresDate,
    },
  });

  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  return {
    id: admin.id,
    email: admin.email as string & tags.Format<"email">,
    display_name: admin.display_name === null ? undefined : admin.display_name,
    status: admin.status,
    failed_login_count: admin.failed_login_count,
    last_login_at:
      admin.last_login_at === null
        ? undefined
        : (toISOStringSafe(admin.last_login_at) as string &
            tags.Format<"date-time">),
    created_at: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      admin.deleted_at === null
        ? undefined
        : (toISOStringSafe(admin.deleted_at) as string &
            tags.Format<"date-time">),
    token,
  };
}
