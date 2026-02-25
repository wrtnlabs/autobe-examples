import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthSuperAdminJoin(props: {
  body: IDiscussionBoardSuperAdmin.IJoin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  // Check duplicate email
  const existing =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: { email: props.body.email },
    });
  if (existing) throw new HttpException("Email already registered", 409);
  // Create super admin with bcrypt-hashed password
  const superAdmin = await MyGlobal.prisma.discussion_board_super_admins.create(
    {
      data: {
        id: v4(),
        email: props.body.email,
        password_hash: await PasswordUtil.hash(props.body.password),
        is_super_admin: true,
        can_promote_super_admins: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        is_super_admin: true,
        can_promote_super_admins: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  // Create email verification token
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await MyGlobal.prisma.discussion_board_super_admin_email_verifications.create(
    {
      data: {
        id: v4(),
        super_admin_id: superAdmin.id,
        token: v4(),
        expires_at: expiresAt,
        verified_at: null,
        ip_address: null,
        user_agent: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    },
  );
  // Build response with proper type conversion
  const response: IDiscussionBoardSuperAdmin.IAuthorized = {
    id: superAdmin.id,
    email: superAdmin.email,
    isSuperAdmin: superAdmin.is_super_admin,
    canPromoteSuperAdmins: superAdmin.can_promote_super_admins,
    createdAt: toISOStringSafe(superAdmin.created_at),
    updatedAt: toISOStringSafe(superAdmin.updated_at),
    deletedAt: superAdmin.deleted_at
      ? toISOStringSafe(superAdmin.deleted_at)
      : null,
    token: {
      access: "",
      refresh: "",
      expired_at: "",
      refreshable_until: "",
    },
  };
  return response;
}
