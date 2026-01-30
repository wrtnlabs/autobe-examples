import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postEconomicForumAuthAdminLogin(props: {
  body: IEconomicForumAdmin.ILogin;
}): Promise<IEconomicForumAdmin.IAuthorized> {
  // Find admin by email
  const admin = await MyGlobal.prisma.economic_forum_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check email verification status - use admin_id to find verification record
  const emailVerification =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.findFirst({
      where: { admin_id: admin.id },
      select: { id: true, email: true },
    });
  if (!emailVerification) {
    throw new HttpException("Email not verified", 403);
  }
  // Create new admin session
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.economic_forum_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // Get admin computed properties from configurations and system audits
  const config = await MyGlobal.prisma.economic_forum_configurations.findFirst({
    where: { admin_id: admin.id },
    select: { key: true, value: true },
  });
  const latestAudit =
    await MyGlobal.prisma.economic_forum_system_audits.findFirst({
      where: { admin_id: admin.id },
      orderBy: { timestamp: "desc" },
      select: { action: true, timestamp: true },
    });
  // Determine admin status and role from system audits
  let status = "active";
  let role = "observer";
  if (latestAudit) {
    if (latestAudit.action === "admin_suspended") {
      status = "suspended";
    } else if (latestAudit.action === "admin_deactivated") {
      status = "inactive";
    }
    if (latestAudit.action === "admin_promoted_to_super_admin") {
      role = "super_admin";
    } else if (latestAudit.action === "admin_promoted_to_moderator") {
      role = "moderator";
    }
  }
  // Use email from verification record
  const computedEmail = emailVerification.email;
  // Construct the response
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Return authorized admin object with computed fields
  return {
    id: admin.id,
    token,
    email: computedEmail,
    name: config?.value || "System Admin",
    role,
    status,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
  } satisfies IEconomicForumAdmin.IAuthorized;
}
