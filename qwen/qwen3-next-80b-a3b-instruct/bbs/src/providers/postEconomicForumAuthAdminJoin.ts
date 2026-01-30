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

export async function postEconomicForumAuthAdminJoin(props: {
  body: IEconomicForumAdmin.IJoin;
}): Promise<IEconomicForumAdmin.IAuthorized> {
  // 1. Create admin record with password hash
  const admin = await MyGlobal.prisma.economic_forum_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // 2. Create email verification token record
  const verificationToken = v4();
  const emailVerification =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.create({
      data: {
        id: verificationToken,
        token: verificationToken,
        email: props.body.email,
        created_at: toISOStringSafe(new Date()),
        expires_at: toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        created_by_admin_id: admin.id,
      },
    });
  // 3. Create session record for authentication
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.economic_forum_admin_sessions.create({
    data: {
      id: v4(),
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
      admin_id: admin.id,
      session_status: "active",
      ip_address: "127.0.0.1",
      referrer_url: "",
      request_uri: "",
    },
  });
  // 4. Generate JWT tokens
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
        created_at: toISOStringSafe(new Date()),
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
  // 5. Return IAuthorized response with computed properties
  // Computed properties derived from database records:
  // - email: from economic_forum_admin_email_verifications where verified = true
  // - name: from economic_forum_configurations mapping admin id to admin_name
  // - role: from economic_forum_admin_sessions permission_level (most recent)
  // - status: from economic_forum_system_audits latest audit
  // - createdAt: from earliest system audit - admin_created event
  // - updatedAt: from most recent system audit
  const emailVerifiedRecord =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.findFirst({
      where: {
        created_by_admin_id: admin.id,
        status: "verified",
      },
      orderBy: {
        created_at: "desc",
      },
    });
  const config = await MyGlobal.prisma.economic_forum_configurations.findUnique(
    {
      where: {
        admin_id: admin.id,
      },
    },
  );
  const latestSession =
    await MyGlobal.prisma.economic_forum_admin_sessions.findFirst({
      where: {
        admin_id: admin.id,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  // Determine status based on latest audit
  const latestAudit =
    await MyGlobal.prisma.economic_forum_system_audits.findFirst({
      where: {
        admin_id: admin.id,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  // Determine createdAt from earliest audit or fallback to verification
  const earliestAudit =
    await MyGlobal.prisma.economic_forum_system_audits.findFirst({
      where: {
        admin_id: admin.id,
        action: "admin_created",
      },
      orderBy: {
        created_at: "asc",
      },
    });
  const createdAt = earliestAudit ? earliestAudit.created_at : admin.created_at;
  const updatedAt = latestAudit ? latestAudit.created_at : admin.created_at;
  // Construct final response
  const response: IEconomicForumAdmin.IAuthorized = {
    id: admin.id,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
    email: emailVerifiedRecord ? emailVerifiedRecord.email : admin.email,
    name: config?.admin_name ?? "System Admin",
    role: latestSession?.session_role ?? "observer",
    status:
      latestAudit?.action === "admin_suspended"
        ? "suspended"
        : latestAudit
          ? "active"
          : "inactive",
    createdAt: toISOStringSafe(createdAt),
    updatedAt: toISOStringSafe(updatedAt),
  };
  return response;
}
