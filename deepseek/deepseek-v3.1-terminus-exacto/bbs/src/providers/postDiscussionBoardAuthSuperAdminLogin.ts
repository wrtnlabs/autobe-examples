import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthSuperAdminLogin(props: {
  body: IDiscussionBoardSuperAdmin.ILogin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  // 1. Find super admin by email with password_hash
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        password_hash: true,
        privilege_level: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (!superAdmin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
      data: {
        id: v4(),
        discussion_board_super_admin_id: superAdmin.id,
        access_token: v4(), // Temporary placeholder, will be replaced by JWT
        refresh_token: v4(), // Temporary placeholder
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: accessExpires.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "superadmin",
        id: superAdmin.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadmin",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Update session with actual JWT tokens
  await MyGlobal.prisma.discussion_board_super_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token: token.access,
      refresh_token: token.refresh,
    },
  });
  // 6. Find section administrator assignment for transformation
  const sectionAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        discussion_board_super_admin_id: superAdmin.id,
        deleted_at: null,
      },
      ...DiscussionBoardSuperAdminTransformer.select(),
    });
  if (!sectionAssignment) {
    throw new HttpException("No valid section assignment found", 403);
  }
  // 7. Transform and return authorized response
  const transformedAdmin =
    await DiscussionBoardSuperAdminTransformer.transform(sectionAssignment);
  return {
    id: transformedAdmin.id,
    permission_level: transformedAdmin.permission_level,
    assignment_date: transformedAdmin.assignment_date,
    admin: transformedAdmin.admin,
    superAdmin: transformedAdmin.superAdmin,
    section: transformedAdmin.section,
    created_at: transformedAdmin.created_at,
    updated_at: transformedAdmin.updated_at,
    deleted_at: transformedAdmin.deleted_at,
    email: superAdmin.email,
    privilege_level: superAdmin.privilege_level,
    token,
  } satisfies IDiscussionBoardSuperAdmin.IAuthorized;
}
