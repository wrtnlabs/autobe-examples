import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function postAuthSystemAdminLogin(props: {
  systemAdmin: SystemadminPayload;
  body: ICommunityBbsSystemAdmin.ILogin;
}): Promise<ICommunityBbsSystemAdmin.IAuthorized> {
  const { systemAdmin, body } = props;

  // If an authenticated actor is provided, ensure it's the expected type
  if (systemAdmin && systemAdmin.type !== "systemadmin") {
    throw new HttpException("Unauthorized", 403);
  }

  // Resolve client context values
  const ip: string = body.ip ?? "0.0.0.0";
  const href: string & tags.Format<"uri"> = body.href;
  const referrer: string & tags.Format<"uri"> = body.referrer;

  // 1) Locate admin by email
  const admin = await MyGlobal.prisma.community_bbs_systemadmin.findFirst({
    where: { email: body.email },
  });

  // 2) If admin not found => audit + generic error (no existence leak)
  if (!admin) {
    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "system_admin",
        actor_id: null,
        entity: "system_admin_auth",
        action: "login_failed",
        payload: JSON.stringify({ email: body.email, ip, href, referrer }),
        ip,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Invalid credentials", 401);
  }

  // 3) Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(body.password, admin.password_hash);
  if (!isValid) {
    await MyGlobal.prisma.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "system_admin",
        actor_id: admin.id,
        entity: "system_admin_auth",
        action: "login_failed",
        payload: JSON.stringify({ ip, href, referrer }),
        ip,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Invalid credentials", 401);
  }

  // 4) Create a new session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.community_bbs_systemadmin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_bbs_systemadmin_id: admin.id,
        ip,
        href,
        referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // 5) Update admin metadata (updated_at)
  await MyGlobal.prisma.community_bbs_systemadmin.update({
    where: { id: admin.id },
    data: { updated_at: toISOStringSafe(new Date()) },
  });

  // 6) Record successful login in audit logs
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "system_admin",
      actor_id: admin.id,
      entity: "system_admin_auth",
      action: "login",
      payload: JSON.stringify({ ip, href, referrer, session_id: session.id }),
      ip,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // 7) Generate JWT tokens
  const now = toISOStringSafe(new Date());

  const token = {
    access: jwt.sign(
      {
        type: "systemadmin",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),

    refresh: jwt.sign(
      {
        type: "systemadmin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),

    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;

  // 8) Build sanitized admin summary
  const adminSummary = {
    id: admin.id,
    display_name: admin.display_name ?? null,
    is_super_admin: admin.is_super_admin ?? undefined,
    created_at: admin.created_at ? toISOStringSafe(admin.created_at) : null,
  } satisfies ICommunityBbsSystemAdmin.ISummary;

  // 9) Return authorized payload
  return {
    id: admin.id,
    token,
    admin: adminSummary,
  };
}
