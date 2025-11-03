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

export async function postAuthSystemAdminRefresh(props: {
  systemAdmin: SystemadminPayload;
  body: ICommunityBbsSystemAdmin.IRefresh;
}): Promise<ICommunityBbsSystemAdmin.IAuthorized> {
  const { systemAdmin, body } = props;

  // Verify and decode refresh token
  let decoded: { id: string; session_id: string; type: string };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: string };
  } catch (err) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Token type must be systemadmin
  if (decoded.type !== "systemadmin") {
    throw new HttpException("Invalid token type", 403);
  }

  // If a systemAdmin actor was provided, enforce that it matches the token
  if (systemAdmin && systemAdmin.id !== decoded.id) {
    throw new HttpException(
      "Unauthorized: token does not belong to the provided systemAdmin",
      403,
    );
  }

  // Validate session exists and is not expired/revoked
  const session =
    await MyGlobal.prisma.community_bbs_systemadmin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_bbs_systemadmin_id: decoded.id,
        OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
      },
    });

  if (!session) throw new HttpException("Session expired or revoked", 401);

  // Validate admin account is active (not soft-deleted)
  const admin = await MyGlobal.prisma.community_bbs_systemadmin.findFirst({
    where: { id: decoded.id, deleted_at: null },
  });
  if (!admin) throw new HttpException("Account has been deleted", 403);

  // Prepare token timestamps
  const nowIso = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Generate JWTs (reuse same session_id)
  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Update session expiration to new refresh expiry
  await MyGlobal.prisma.community_bbs_systemadmin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: toISOStringSafe(refreshExpires) },
  });

  // Record an audit log for the refresh event
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "system_admin",
      actor_id: admin.id,
      entity: "session",
      action: "refresh",
      payload: JSON.stringify({ session_id: decoded.session_id }),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return authorized response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
    admin: {
      id: admin.id as string & tags.Format<"uuid">,
      display_name: admin.display_name ?? null,
      is_super_admin: admin.is_super_admin ?? undefined,
      created_at: admin.created_at ? toISOStringSafe(admin.created_at) : null,
    },
  };
}
