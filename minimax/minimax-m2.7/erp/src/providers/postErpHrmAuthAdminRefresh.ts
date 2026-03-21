import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthAdminRefresh(props: {
  body: IErpHrmAdmin.IRefresh;
}): Promise<IErpHrmAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
    tokenType?: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is active
  const session = await MyGlobal.prisma.erp_hrm_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      erp_hrm_admin_id: decoded.id,
    },
    select: {
      id: true,
      expired_at: true,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check if session is expired
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate admin exists
  const admin = await MyGlobal.prisma.erp_hrm_admins.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_uri: true,
      phone: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }
  // 6. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.erp_hrm_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Return authorized response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email,
    display_name: admin.display_name,
    avatar_uri: admin.avatar_uri === null ? undefined : admin.avatar_uri,
    phone: admin.phone,
    created_at: admin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: admin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
