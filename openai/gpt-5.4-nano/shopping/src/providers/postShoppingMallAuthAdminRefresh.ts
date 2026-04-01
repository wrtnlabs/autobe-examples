import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const nowIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date()),
  );
  let decoded: any;
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Invalid refresh token", 401);
  }
  const payload = decoded as {
    type?: unknown;
    id?: unknown;
    session_id?: unknown;
  };
  if (payload.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  if (
    typeof payload.id !== "string" ||
    typeof payload.session_id !== "string"
  ) {
    throw new HttpException("Invalid refresh token", 401);
  }
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      shopping_mall_admin_id: payload.id,
      deleted_at: null,
      expired_at: { gt: new Date() },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpiresIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const refreshExpiresIso = typia.assert<string & tags.Format<"date-time">>(
    toISOStringSafe(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
  );
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: payload.id,
      session_id: payload.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: payload.id,
      session_id: payload.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: payload.session_id },
    data: { expired_at: new Date(refreshExpiresIso) },
  });
  return {
    id: payload.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    created_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(admin.created_at),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(admin.updated_at),
    ),
    deleted_at:
      admin.deleted_at === null
        ? null
        : typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(admin.deleted_at),
          ),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  };
}
