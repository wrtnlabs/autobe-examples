import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserRefresh(props: {
  body: ICommunityPlatformMemberUser.IRefresh;
}): Promise<ICommunityPlatformMemberUser.IAuthorized> {
  const { body } = props;

  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException(
      "Unauthorized: Invalid or expired refresh token",
      401,
    );
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Unauthorized: Invalid token payload", 401);
  }

  const payload = decoded as jwt.JwtPayload;
  const tokenType =
    typeof payload["tokenType"] === "string"
      ? (payload["tokenType"] as string)
      : undefined;
  if (tokenType !== undefined && tokenType !== "refresh") {
    throw new HttpException(
      "Unauthorized: Invalid token type for refresh",
      401,
    );
  }

  const idFromToken =
    typeof payload["id"] === "string"
      ? (payload["id"] as string)
      : typeof payload["userId"] === "string"
        ? (payload["userId"] as string)
        : undefined;

  if (!idFromToken) {
    throw new HttpException("Unauthorized: Missing subject in token", 401);
  }

  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: idFromToken },
  });

  if (!user) {
    throw new HttpException("Unauthorized: User not found", 401);
  }

  if (user.deleted_at !== null) {
    throw new HttpException("Forbidden: Account is deleted", 403);
  }

  const forbiddenStates = new Set([
    "Banned",
    "Locked",
    "Deactivated",
    "PendingDeletion",
    "Deleted",
  ]);
  if (forbiddenStates.has(user.account_state)) {
    throw new HttpException("Forbidden: Account state prohibits refresh", 403);
  }

  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: { updated_at: toISOStringSafe(new Date()) },
  });

  const accessPayload = {
    id: user.id,
    type: "memberuser",
    tokenType: "access",
  } as const;
  const refreshPayload = {
    id: user.id,
    type: "memberuser",
    tokenType: "refresh",
  } as const;

  const newAccessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const newRefreshToken = jwt.sign(
    refreshPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const nowMs = Date.now();
  const accessExp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMs + 60 * 60 * 1000),
  );
  const refreshExp: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name ?? undefined,
    email_verified: user.email_verified,
    account_state: user.account_state,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
  };
}
