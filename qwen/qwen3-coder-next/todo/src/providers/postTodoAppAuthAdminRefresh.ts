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

export async function postTodoAppAuthAdminRefresh(props: {
  body: ITodoAppAdminSession.IRefresh;
}): Promise<ITodoAppAdminSession.IAuthorized> {
  try {
    const decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "admin";
      created_at: string;
    };
    if (decoded.type !== "admin") {
      throw new HttpException("Invalid token type", 403);
    }
    const session = await MyGlobal.prisma.todo_app_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        admin_id: decoded.id,
        deleted_at: null,
      },
    });
    if (!session) {
      throw new HttpException("Session not found or revoked", 401);
    }
    const admin = await MyGlobal.prisma.todo_app_admins.findUniqueOrThrow({
      where: { id: decoded.id },
      select: { id: true, email: true },
    });
    const expires_at = new Date(Date.now() + 15 * 60 * 1000);
    const refreshable_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const access_token = jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    );
    const refresh_token = jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    );
    await MyGlobal.prisma.todo_app_admin_sessions.update({
      where: { id: decoded.session_id },
      data: {
        expires_at: refreshable_until,
        ip: props.body.ip ?? session.ip,
        href: props.body.href ?? session.href,
        referrer: props.body.referrer ?? session.referrer,
        updated_at: new Date(),
      },
    });
    return {
      id: admin.id,
      email: admin.email,
      token: {
        access: access_token,
        refresh: refresh_token,
        expired_at: toISOStringSafe(expires_at),
        refreshable_until: toISOStringSafe(refreshable_until),
      },
    };
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException("Invalid or expired refresh token", 401);
  }
}
