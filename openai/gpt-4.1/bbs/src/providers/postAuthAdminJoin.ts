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

export async function postAuthAdminJoin(props: {
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // 1. Check if email already exists
  const existing = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      email: props.body.email,
    },
  });
  if (existing) {
    throw new HttpException("Email already registered as an admin", 409);
  }

  // 2. Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);

  // 3. Prepare timestamp strings
  const now = toISOStringSafe(new Date());

  // 4. Create admin
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 5. Access and refresh token settings
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // 6. Create admin session with required string ip property
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      ip:
        props.body.ip !== undefined && props.body.ip !== null
          ? (props.body.ip satisfies string as string)
          : "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiredAt,
    },
  });

  // 7. JWT tokens
  const token = {
    access: jwt.sign(
      {
        id: admin.id,
        session_id: session.id,
        type: "admin",
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
        id: admin.id,
        session_id: session.id,
        type: "admin",
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  // 8. Return full authorized admin DTO
  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at != null ? toISOStringSafe(admin.deleted_at) : undefined,
    token,
  };
}
