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

export async function postDiscussionBoardAuthSuperAdminLogin(props: {
  body: IDiscussionBoardSuperAdmin.ILogin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  // 1. Find super administrator by email with password_hash
  const admin = await MyGlobal.prisma.discussion_board_super_admins.findFirst({
    where: { email: props.body.email, deleted_at: null },
    select: {
      id: true,
      email: true,
      password_hash: true,
      is_super_admin: true,
      can_promote_super_admins: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create new session record
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        super_admin_id: admin.id as string & tags.Format<"uuid">,
        access_token: "", // Will be populated after JWT generation
        refresh_token: "", // Will be populated after JWT generation
        ip: "0.0.0.0", // Default IP if not provided
        active: true,
        created_at: now,
        expired_at: accessExpires,
        updated_at: now,
      },
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
      },
    });
  // 4. Generate JWT tokens
  const accessPayload = {
    type: "superadmin",
    id: admin.id,
    session_id: session.id,
    created_at: now,
  };
  const refreshPayload = {
    type: "superadmin",
    id: admin.id,
    session_id: session.id,
    tokenType: "refresh",
    created_at: now,
  };
  const access_token = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refresh_token = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
    issuer: "autobe",
  });
  // 5. Update session with generated tokens
  await MyGlobal.prisma.discussion_board_super_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token,
      refresh_token,
    },
  });
  // 6. Build and return response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    isSuperAdmin: admin.is_super_admin,
    canPromoteSuperAdmins: admin.can_promote_super_admins,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies IDiscussionBoardSuperAdmin.IAuthorized;
}
