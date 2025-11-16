import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: IDiscussionBoardAdmin.IJoin;
}): Promise<IDiscussionBoardAdmin.IAuthorized> {
  // Step 1: Check for duplicate email
  const existingAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existingAdmin) {
    throw new HttpException("Email already registered.", 409);
  }

  // Step 2: Password strength validation
  const password = props.body.password;
  const hasMinLen = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (!(hasMinLen && hasLetter && hasNumber && hasSpecial)) {
    throw new HttpException(
      "Password must be at least 8 characters and include a letter, a number, and a special character.",
      400,
    );
  }

  // Step 3: Hash the password
  const hashedPassword = await PasswordUtil.hash(password);

  // Step 4: Create the admin record
  const now = toISOStringSafe(new Date());
  const adminId = v4();
  const admin = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: hashedPassword,
      is_active: true,
      is_email_verified: false,
      is_blocked: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 5: Create the admin session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  const session = await MyGlobal.prisma.discussion_board_admin_sessions.create({
    data: {
      id: sessionId,
      discussion_board_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Step 6: JWT tokens
  const jwtPayload = {
    type: "admin",
    id: admin.id,
    session_id: session.id,
    created_at: now,
  };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...jwtPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email,
    is_email_verified: admin.is_email_verified,
    is_active: admin.is_active,
    is_blocked: admin.is_blocked,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at !== null && admin.deleted_at !== undefined
        ? toISOStringSafe(admin.deleted_at)
        : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
