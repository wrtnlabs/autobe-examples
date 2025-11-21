import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminLogin(props: {
  admin: AdminPayload;
  body: ICommunityBBSAdmin.ILogin;
}): Promise<ICommunityBBSAdmin.IAuthorized> {
  // Find admin by email (ILogin is string type representing email)
  const admin = await MyGlobal.prisma.community_bbs_admin.findFirst({
    where: { email: props.body },
  });

  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password (password is plain text from body, hash stored in DB)
  const isValid = await PasswordUtil.verify(props.body, admin.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check if admin account is active
  if (admin.deleted_at !== null) {
    throw new HttpException("Account is suspended", 403);
  }

  // Create new session record
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.community_bbs_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_bbs_admin_id: admin.id,
      ip: (props.body as any).ip ?? "",
      href: (props.body as any).href ?? "",
      referrer: (props.body as any).referrer ?? "",
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });

  // Update updated_at field to reflect login activity instead of non-existent last_login_at
  await MyGlobal.prisma.community_bbs_admin.update({
    where: { id: admin.id },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Generate JWT tokens with exact payload structure
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "15m",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: admin.id,
    token,
  };
}
