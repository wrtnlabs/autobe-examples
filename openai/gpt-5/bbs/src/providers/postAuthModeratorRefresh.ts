import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorRefresh(props: {
  body: IEconDiscussModerator.IRefresh;
}): Promise<IEconDiscussModerator.IAuthorized> {
  const { body } = props;

  // Step 1: Verify and decode the refresh token
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

  // Extract claims from decoded token
  const claims = decoded as
    | { id?: string; type?: string; token_type?: string }
    | string;
  if (typeof claims === "string") {
    throw new HttpException("Unauthorized: Malformed token payload", 401);
  }
  if (
    claims.token_type !== "refresh" ||
    claims.type !== "moderator" ||
    !claims.id
  ) {
    throw new HttpException("Unauthorized: Invalid refresh token", 401);
  }

  // Step 2: Load user and revalidate moderator role
  const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { id: claims.id },
  });
  if (!user) {
    // Do not reveal whether the account exists
    throw new HttpException("Unauthorized: Invalid token subject", 401);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("Forbidden: Account is deactivated", 403);
  }

  const moderator = await MyGlobal.prisma.econ_discuss_moderators.findFirst({
    where: { user_id: user.id, deleted_at: null },
  });
  if (!moderator) {
    throw new HttpException("Forbidden: Moderator role no longer exists", 403);
  }

  // Step 3: Generate new tokens (access + rotated refresh)
  const accessToken = jwt.sign(
    { id: user.id, type: "moderator" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: user.id, type: "moderator", token_type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Expiration timestamps
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Step 4: Build authorized response
  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
    role: "moderator",
    display_name: user.display_name,
    email_verified: user.email_verified,
    mfa_enabled: user.mfa_enabled,
    timezone: user.timezone ?? null,
    locale: user.locale ?? null,
    // avatar_uri intentionally omitted to avoid branding mismatch when nullables are present
  };
}
