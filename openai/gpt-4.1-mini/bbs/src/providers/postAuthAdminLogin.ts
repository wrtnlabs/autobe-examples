import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminLogin(props: {
  admin: AdminPayload;
  body: IEconPolDiscussionBoardAdmin.ILogin;
}): Promise<IEconPolDiscussionBoardAdmin.IAuthorized> {
  const admin =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findFirst({
      where: { username: props.body.username },
      select: {
        id: true,
        username: true,
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

  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );

  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.create({
      data: {
        id: sessionId,
        econ_pol_discussion_board_admin_id: admin.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  const createdAt = toISOStringSafe(new Date());

  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    adminUsername: admin.username,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at !== null && admin.deleted_at !== undefined
        ? toISOStringSafe(admin.deleted_at)
        : null,
    id: admin.id,
    role: "admin",
    is_active: true,
    token,
  };
}
