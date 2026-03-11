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

export async function postDiscussionBoardAuthSuperAdminLogin(props: {
  ip: string;
  body: IDiscussionBoardSuperAdmin.ILogin;
}): Promise<IDiscussionBoardSuperAdmin.IAuthorized> {
  // Find super admin by email with password_hash
  const superAdmin =
    await MyGlobal.prisma.discussion_board_super_admins.findFirst({
      where: { email: props.body.email },
      select: {
        ...DiscussionBoardSuperAdminTransformer.select().select,
        password_hash: true,
      },
    });
  if (!superAdmin) throw new HttpException("Invalid credentials", 401);
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // Create session expiration times as ISO strings
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Create new session with string dates
  const session =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.create({
      data: {
        id: v4(),
        discussion_board_super_admin_id: superAdmin.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    });
  // Generate JWT tokens with string dates
  const token = {
    access: jwt.sign(
      {
        type: "superAdmin",
        id: superAdmin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superAdmin",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Return authorized response
  return {
    ...(await DiscussionBoardSuperAdminTransformer.transform(superAdmin)),
    token,
  };
}
