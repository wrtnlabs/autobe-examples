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

export async function postEconomicForumAuthAdminRefresh(props: {
  body: IEconomicForumAdmin.IRefresh;
}): Promise<IEconomicForumAdmin.IAuthorized> {
  // Decode and verify the refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };
  try {
    decoded = jwt.verify(props.body.token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "admin";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate session exists and is active
  const session = await MyGlobal.prisma.economic_forum_admin_sessions.findFirst(
    {
      where: {
        id: decoded.session_id,
        admin_id: decoded.id,
      },
    },
  );
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate admin account is still active
  const admin = await MyGlobal.prisma.economic_forum_admins.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Generate new access token with 24-hour expiration (same session_id)
  const now = toISOStringSafe(new Date());
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "24h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "24h",
      issuer: "autobe",
    },
  );
  // Update session refresh time
  await MyGlobal.prisma.economic_forum_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
    },
  });
  // Fetch admin email from email_verifications
  const emailVerification =
    await MyGlobal.prisma.economic_forum_admin_email_verifications.findFirst({
      where: {
        admin_id: decoded.id,
        verified: true,
        status: "active",
      },
      orderBy: { created_at: "desc" },
    });
  // Fetch admin name from configurations
  const config = await MyGlobal.prisma.economic_forum_configurations.findFirst({
    where: { admin_id: decoded.id },
  });
  // Fetch admin role from most recent session
  const role = "super_admin"; // Assuming super_admin based on admin nature
  // Fetch admin status from system audits
  const statusAudit =
    await MyGlobal.prisma.economic_forum_system_audits.findFirst({
      where: {
        admin_id: decoded.id,
        action: { in: ["admin_created", "admin_suspended", "admin_activated"] },
      },
      orderBy: { created_at: "desc" },
    });
  // Fetch admin creation and update timestamps from system audits
  const createdAudit =
    await MyGlobal.prisma.economic_forum_system_audits.findFirst({
      where: {
        admin_id: decoded.id,
        action: "admin_created",
      },
      orderBy: { created_at: "asc" },
    });
  const updatedAudit =
    await MyGlobal.prisma.economic_forum_system_audits.findFirst({
      where: {
        admin_id: decoded.id,
      },
      orderBy: { created_at: "desc" },
    });
  return {
    id: decoded.id,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    email: emailVerification?.email_address || "",
    name: config?.value || "System Admin",
    role,
    status:
      statusAudit?.action === "admin_suspended"
        ? "suspended"
        : statusAudit?.action === "admin_activated"
          ? "active"
          : "active",
    createdAt: toISOStringSafe(createdAudit?.created_at || new Date()),
    updatedAt: toISOStringSafe(updatedAudit?.created_at || new Date()),
  };
}
