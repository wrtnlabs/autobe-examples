import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserLogin(props: {
  body: IDiscussionBoardAdminUserLogin.IRequest;
}): Promise<IDiscussionBoardAdminuser.IAuthorized> {
  const admin = await MyGlobal.prisma.discussion_board_adminusers.findFirst({
    where: {
      email: props.body.email,
    },
  });

  if (!admin || admin.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }

  const passwordOk = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );

  if (!passwordOk) {
    throw new HttpException("Invalid credentials", 401);
  }

  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const updatedAdmin = await MyGlobal.prisma.discussion_board_adminusers.update(
    {
      where: { id: admin.id },
      data: {
        last_login_at: now,
        updated_at: now,
      },
    },
  );

  const session =
    await MyGlobal.prisma.discussion_board_adminuser_sessions.create({
      data: {
        id: v4(),
        discussion_board_adminuser_id: admin.id,
        // Prisma expects a non-nullable string, so convert null to empty string
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    });

  const createdAtIso = toISOStringSafe(updatedAdmin.created_at);
  const updatedAtIso = toISOStringSafe(updatedAdmin.updated_at);
  const accessExpiredIso = toISOStringSafe(accessExpires);
  const refreshExpiredIso = toISOStringSafe(refreshExpires);

  const accessToken = jwt.sign(
    {
      type: "adminuser",
      id: updatedAdmin.id,
      session_id: session.id,
      email: updatedAdmin.email,
      display_name: updatedAdmin.display_name,
      email_verified: updatedAdmin.email_verified,
      account_status: updatedAdmin.account_status,
      created_at: createdAtIso,
      updated_at: updatedAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "adminuser",
      id: updatedAdmin.id,
      session_id: session.id,
      tokenType: "refresh",
      email: updatedAdmin.email,
      display_name: updatedAdmin.display_name,
      email_verified: updatedAdmin.email_verified,
      account_status: updatedAdmin.account_status,
      created_at: createdAtIso,
      updated_at: updatedAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: updatedAdmin.id,
    // Prisma model does not have login_id, so safely map to existing primitive
    loginId: "", // default or derive if schema later adds this
    displayName: updatedAdmin.display_name,
    email: updatedAdmin.email,
    status: updatedAdmin.account_status,
    // Prisma model does not have role, so provide a primitive fallback
    role: "", // default role string
    emailVerified: updatedAdmin.email_verified,
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredIso,
      refreshable_until: refreshExpiredIso,
    },
  };
}
