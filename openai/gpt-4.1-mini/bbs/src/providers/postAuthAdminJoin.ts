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

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IEconPolDiscussionBoardAdmin.IJoin;
}): Promise<IEconPolDiscussionBoardAdmin.IAuthorized> {
  const { username, email, password } = props.body;

  const existingAdmin =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

  if (existingAdmin !== null) {
    throw new HttpException("Username or email already registered.", 409);
  }

  const passwordHash = await PasswordUtil.hash(password);

  const now = toISOStringSafe(new Date());

  const adminRecord =
    await MyGlobal.prisma.econ_pol_discussion_board_admins.create({
      data: {
        id: v4(),
        username,
        email,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  );

  const sessionRecord =
    await MyGlobal.prisma.econ_pol_discussion_board_admin_sessions.create({
      data: {
        id: v4(),
        econ_pol_discussion_board_admin_id: adminRecord.id,
        created_at: now,
        expired_at: accessExpiredAt,
        ip: "",
        href: "",
        referrer: "",
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: adminRecord.id,
        session_id: sessionRecord.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: adminRecord.id,
        session_id: sessionRecord.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  return {
    adminUsername: adminRecord.username,
    email: adminRecord.email,
    created_at: toISOStringSafe(new Date(adminRecord.created_at)),
    updated_at: toISOStringSafe(new Date(adminRecord.updated_at)),
    deleted_at:
      adminRecord.deleted_at !== null && adminRecord.deleted_at !== undefined
        ? toISOStringSafe(new Date(adminRecord.deleted_at))
        : null,
    role: "admin",
    is_active: true,
    id: adminRecord.id,
    token,
  };
}
