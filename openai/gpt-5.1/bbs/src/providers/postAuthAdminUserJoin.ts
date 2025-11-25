import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserJoin(props: {
  body: IDiscussionBoardAdminUserJoin.IRequest;
}): Promise<IDiscussionBoardAdminuser.IAuthorized> {
  const email = props.body.email;

  const existing = await MyGlobal.prisma.discussion_board_adminusers.findFirst({
    where: {
      email,
    },
  });

  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const passwordHash = await PasswordUtil.hash(props.body.password);

  const now = new Date();
  const nowIso = toISOStringSafe(now);

  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const accessExpiresIso = toISOStringSafe(accessExpires);
  const refreshExpiresIso = toISOStringSafe(refreshExpires);

  const createdAdmin = await MyGlobal.prisma.discussion_board_adminusers.create(
    {
      data: {
        id: v4(),
        email,
        password_hash: passwordHash,
        display_name: props.body.display_name,
        bio: props.body.bio === undefined ? null : props.body.bio,
        email_verified: false,
        account_status: "active",
        created_at: now,
        updated_at: now,
        deleted_at: null,
        last_login_at: null,
      },
    },
  );

  const createdSession =
    await MyGlobal.prisma.discussion_board_adminuser_sessions.create({
      data: {
        id: v4(),
        discussion_board_adminuser_id: createdAdmin.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    });

  const accessToken = jwt.sign(
    {
      id: createdAdmin.id,
      session_id: createdSession.id,
      type: "adminuser",
      email: createdAdmin.email,
      display_name: createdAdmin.display_name,
      email_verified: createdAdmin.email_verified,
      account_status: createdAdmin.account_status,
      created_at: nowIso,
      updated_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: createdAdmin.id,
      session_id: createdSession.id,
      type: "adminuser",
      email: createdAdmin.email,
      display_name: createdAdmin.display_name,
      email_verified: createdAdmin.email_verified,
      account_status: createdAdmin.account_status,
      created_at: nowIso,
      updated_at: nowIso,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  return {
    id: createdAdmin.id,
    loginId: createdAdmin.email,
    displayName: createdAdmin.display_name,
    email: createdAdmin.email,
    status: createdAdmin.account_status,
    role: "admin",
    emailVerified: createdAdmin.email_verified,
    createdAt: toISOStringSafe(createdAdmin.created_at),
    updatedAt: toISOStringSafe(createdAdmin.updated_at),
    token,
  };
}
