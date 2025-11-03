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

export async function postAuthSystemAdminJoin(props: {
  systemAdmin: SystemadminPayload;
  body: ICommunityBbsSystemAdmin.ICreate;
}): Promise<ICommunityBbsSystemAdmin.IAuthorized> {
  const { systemAdmin, body } = props;

  // Verify caller exists and is active
  const caller = await MyGlobal.prisma.community_bbs_systemadmin.findUnique({
    where: { id: systemAdmin.id },
  });
  if (!caller || caller.deleted_at !== null) {
    throw new HttpException("Unauthorized", 403);
  }

  // Only super-admin callers may create other super-admins
  if (body.is_super_admin === true && !caller.is_super_admin) {
    throw new HttpException(
      "Unauthorized: Only super admins can assign super admin",
      403,
    );
  }

  // Check email uniqueness
  const existing = await MyGlobal.prisma.community_bbs_systemadmin.findFirst({
    where: { email: body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password securely
  const password_hash = await PasswordUtil.hash(body.password);

  // Prepare timestamps once
  const now = toISOStringSafe(new Date());
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpires = toISOStringSafe(accessExpiresDate);
  const refreshExpires = toISOStringSafe(refreshExpiresDate);

  // Create the system admin record
  const created = await MyGlobal.prisma.community_bbs_systemadmin.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: body.email,
      password_hash,
      display_name: body.display_name ?? null,
      is_super_admin: body.is_super_admin ?? false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create initial session for auditability (IP not provided by DTO)
  const session =
    await MyGlobal.prisma.community_bbs_systemadmin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_bbs_systemadmin_id: created.id,
        ip: "",
        href: null,
        referrer: null,
        created_at: now,
        expired_at: accessExpires,
      },
    });

  // Token payload timestamps - reuse 'now' for creation time
  const tokenPayloadBase = {
    type: "systemadmin",
    id: created.id,
    session_id: session.id,
    created_at: now,
  } as const;

  const access = jwt.sign(tokenPayloadBase, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refresh = jwt.sign(
    {
      ...tokenPayloadBase,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    admin: {
      id: created.id,
      display_name: created.display_name ?? null,
      is_super_admin: created.is_super_admin ?? undefined,
      created_at: now,
    },
  };
}
