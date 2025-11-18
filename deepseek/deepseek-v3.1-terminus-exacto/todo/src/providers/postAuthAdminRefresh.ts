import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: ITodoListAdmin.IRefresh;
}): Promise<ITodoListAdmin.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "admin" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "admin" };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  const admin = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: decoded.id },
  });
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }
  if (admin.deleted_at !== null) {
    throw new HttpException("Admin account deleted", 403);
  }
  if (admin.locked === true) {
    throw new HttpException("Admin account is locked", 403);
  }

  const accessExpiresMs = 60 * 60 * 1000;
  const refreshExpiresMs = 7 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  const accessExpiresDatetime = toISOStringSafe(
    new Date(nowMs + accessExpiresMs),
  );
  const refreshExpiresDatetime = toISOStringSafe(
    new Date(nowMs + refreshExpiresMs),
  );

  const issuedAtDatetime = toISOStringSafe(new Date(nowMs));

  const access = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: decoded.session_id,
      created_at: issuedAtDatetime,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: issuedAtDatetime,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    locked: admin.locked,
    role: admin.role,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpiresDatetime,
      refreshable_until: refreshExpiresDatetime,
    },
  };
}
