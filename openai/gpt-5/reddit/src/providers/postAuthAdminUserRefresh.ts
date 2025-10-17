import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserRefresh";
import { ICommunityPlatformAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserRefresh(props: {
  body: ICommunityPlatformAdminUserRefresh.ICreate;
}): Promise<ICommunityPlatformAdminUser.IAuthorized> {
  const { refresh_token } = props.body;

  // 1) Verify and decode the refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const claims = typia.assert<{
    id?: string;
    userId?: string;
    tokenType?: string;
    type?: string;
  }>(decoded);

  const userId = claims.id ?? claims.userId;
  if (!userId) {
    throw new HttpException("Invalid refresh token payload", 401);
  }
  if (claims.tokenType !== undefined && claims.tokenType !== "refresh") {
    throw new HttpException("Invalid refresh token type", 401);
  }

  // 2) Validate principal and active admin grant
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  if (!user.email_verified) {
    throw new HttpException("Forbidden: Email not verified", 403);
  }

  const adminGrant =
    await MyGlobal.prisma.community_platform_admin_users.findFirst({
      where: {
        community_platform_user_id: user.id,
        revoked_at: null,
        deleted_at: null,
      },
    });
  if (!adminGrant) {
    throw new HttpException("Forbidden: Admin privileges revoked", 403);
  }

  // 3) Audit touch (updated_at)
  const nowIso = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: {
      updated_at: nowIso,
    },
  });

  // 4) Issue tokens with SAME payload structure as login/join
  const accessPayload = {
    id: user.id as string & tags.Format<"uuid">,
    type: "adminuser" as "adminuser",
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshPayload = {
    id: user.id as string & tags.Format<"uuid">,
    type: "adminuser" as "adminuser",
    tokenType: "refresh" as "refresh",
  };
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  const expired_at = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    role: "adminUser",
  };
}
