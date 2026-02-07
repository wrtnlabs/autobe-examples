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
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
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
  // Create super admin account
  const superAdminId = v4();
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const now = toISOStringSafe(new Date());
  const superAdmin = await MyGlobal.prisma.discussion_board_super_admins.create(
    {
      data: {
        id: superAdminId,
        email: props.body.email,
        password_hash: hashedPassword,
        privilege_level: props.body.privilege_level,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );
  // Create session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
      data: {
        id: sessionId,
        discussion_board_super_admin_id: superAdminId,
        access_token: "", // Will be set by JWT
        refresh_token: "", // Will be set by JWT
        ip: "unknown", // Default value since ip doesn't exist on IJoin
        href: "", // Default value since href doesn't exist on IJoin
        referrer: "", // Default value since referrer doesn't exist on IJoin
        expired_at: toISOStringSafe(accessExpires),
        created_at: now,
        updated_at: now,
      },
    });
  // Generate JWT tokens
  const payload = {
    type: "superadmin",
    id: superAdminId,
    session_id: sessionId,
    created_at: now,
  };
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with tokens
  await MyGlobal.prisma.discussion_board_super_admin_sessions.update({
    where: { id: sessionId },
    data: { access_token: accessToken, refresh_token: refreshToken },
  });
  // Transform response
  const transformed =
    await DiscussionBoardSuperAdminTransformer.transform(superAdmin);
  return {
    ...transformed,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
