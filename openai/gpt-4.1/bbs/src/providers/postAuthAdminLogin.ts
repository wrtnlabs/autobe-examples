import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminLogin(props: {
  body: IDiscussionBoardAdmin.ILogin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  const { email, password, href, referrer, ip } = props.body;
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { email },
  });
  if (!admin) {
    throw new HttpException("Invalid email or password", 401);
  }
  if (admin.is_locked) {
    throw new HttpException("Administrator account is locked.", 403);
  }
  if (admin.deleted_at !== null) {
    throw new HttpException("Administrator account is deleted.", 403);
  }
  const valid = await PasswordUtil.verify(password, admin.password_hash);
  if (!valid) {
    throw new HttpException("Invalid email or password", 401);
  }
  const now = toISOStringSafe(new Date());
  const access_expires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refresh_expires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: v4(),
      discussion_board_admin_id: admin.id,
      ip: ip ?? "",
      href,
      referrer,
      created_at: now,
      expired_at: access_expires,
    },
  });
  const accessToken = jwt.sign(
    { type: "admin", id: admin.id, session_id: session.id, created_at: now },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    avatar_url: admin.avatar_url ?? undefined,
    is_locked: admin.is_locked,
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: access_expires,
      refreshable_until: refresh_expires,
    },
  };
}
