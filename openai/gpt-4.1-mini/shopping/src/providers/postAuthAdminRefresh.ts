import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminRefresh(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  let decodedBase: unknown;
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  };

  try {
    decodedBase = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (typeof decodedBase !== "object" || decodedBase === null) {
    throw new HttpException("Invalid token payload", 401);
  }

  decoded = typia.assert(
    decodedBase as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "admin";
    },
  );

  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }

  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_mall_admin_id: decoded.id,
      expired_at: null,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: decoded.id },
  });
  if (!admin) {
    throw new HttpException("Admin account not found or inactive", 403);
  }

  const nowIso = toISOStringSafe(new Date());
  const accessExpiresDate = new Date(Date.now() + 1000 * 60 * 60);
  const refreshExpiresDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const accessExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpiresDate);
  const refreshExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpiresDate);

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
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

  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });

  return {
    id: admin.id,
    email: admin.email,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
