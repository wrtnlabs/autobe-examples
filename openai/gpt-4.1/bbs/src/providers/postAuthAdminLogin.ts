import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  const valid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpiry = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      admin_id: admin.id,
      created_at: now,
      expired_at: accessExpiry,
      ip: "",
      href: "",
      referrer: "",
    },
  });

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiry,
    refreshable_until: refreshExpiry,
  };

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at !== null && admin.deleted_at !== undefined
        ? toISOStringSafe(admin.deleted_at)
        : undefined,
    token,
  };
}
