import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthSystemAdminLogin(props: {
  body: ITodoListSystemAdmin.ILogin;
}): Promise<ITodoListSystemAdmin.IAuthorized> {
  const { email, password } = props.body;

  const normalizedEmail = email.toLowerCase();

  const admin = await MyGlobal.prisma.todo_list_system_admins.findFirst({
    where: {
      email: normalizedEmail,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  const valid = await PasswordUtil.verify(password, admin.password_hash);
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      id: admin.id as string & tags.Format<"uuid">,
      type: "systemadmin" as "systemadmin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      id: admin.id as string & tags.Format<"uuid">,
      type: "systemadmin" as "systemadmin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const adminProfile = {
    id: admin.id as string & tags.Format<"uuid">,
    email: normalizedEmail as string & tags.Format<"email">,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: null,
  };

  return {
    id: adminProfile.id,
    email: adminProfile.email,
    created_at: adminProfile.created_at,
    updated_at: adminProfile.updated_at,
    token: {
      access,
      refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
    admin: adminProfile,
  };
}
