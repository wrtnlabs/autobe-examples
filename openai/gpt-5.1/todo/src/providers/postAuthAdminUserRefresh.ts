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

export async function postAuthAdminUserRefresh(props: {
  body: ITodoAppAdminUser.IRefresh;
}): Promise<ITodoAppAdminUser.IAuthorized> {
  const verified = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
    },
  );

  const decoded: {
    id: string;
    session_id: string;
    type: string;
  } = verified as {
    id: string;
    session_id: string;
    type: string;
  };

  if (decoded.type !== "adminUser") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.todo_app_adminuser_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_adminuser_id: decoded.id,
    },
    include: {
      adminUser: true,
    },
  });

  if (!session || !session.adminUser) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.expired_at !== null) {
    const nowMillis = Date.now();
    const expiredMillis = session.expired_at.getTime();
    if (expiredMillis <= nowMillis) {
      throw new HttpException("Session expired or revoked", 401);
    }
  }

  const admin = session.adminUser;

  if (admin.status !== "active") {
    throw new HttpException("Administrative account is not active", 403);
  }

  const nowMillis = Date.now();
  const accessExpiresMillis = nowMillis + 60 * 60 * 1000;
  const refreshExpiresMillis = nowMillis + 7 * 24 * 60 * 60 * 1000;

  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMillis),
  );
  const accessExpiresIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpiresMillis),
  );
  const refreshExpiresIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiresMillis),
  );

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
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
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.todo_app_adminuser_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: new Date(refreshExpiresMillis),
    },
  });

  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
