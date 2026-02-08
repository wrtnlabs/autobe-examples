import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthAdminRefresh(props: {
  body: ICommunityPlatformAdmin.IRefresh;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  let decoded: unknown;
  try {
    decoded = jwt.verify(
      (props.body as any).refresh_token ?? "",
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate decoded object with typia.assert and type cast
  const safeDecoded = typia.assert<{
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "admin";
  }>(decoded);
  if (safeDecoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.findFirst({
      where: { id: safeDecoded.session_id, admin_id: safeDecoded.id },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const admin =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: { id: safeDecoded.id },
    });
  if (admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const now = Date.now();
  const accessExpires = toISOStringSafe(new Date(now + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  );
  const nowISOString = toISOStringSafe(new Date(now));
  const accessToken = jwt.sign(
    {
      type: safeDecoded.type,
      id: safeDecoded.id,
      session_id: safeDecoded.session_id,
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: safeDecoded.type,
      id: safeDecoded.id,
      session_id: safeDecoded.session_id,
      tokenType: "refresh",
      created_at: nowISOString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.community_platform_admin_sessions.update({
    where: { id: safeDecoded.session_id },
    data: { expired_at: refreshExpires },
  });
  return {
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
