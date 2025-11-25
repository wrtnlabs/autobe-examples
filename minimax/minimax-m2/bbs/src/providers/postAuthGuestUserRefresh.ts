import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

export async function postAuthGuestUserRefresh(props: {
  guestUser: GuestuserPayload;
}): Promise<IEconPoliticalDiscussionGuestUser.IAuthorized> {
  // For guest users, the refresh token is actually in their session_id
  // We need to validate the guest session and generate new tokens

  if (props.guestUser.id === "anonymous") {
    throw new HttpException("Anonymous users cannot refresh tokens", 401);
  }

  // Validate the guest user exists and is active
  const guestUser =
    await MyGlobal.prisma.econ_political_discussion_users.findUnique({
      where: { id: props.guestUser.id },
    });

  if (!guestUser) {
    throw new HttpException("Guest user not found", 404);
  }

  if (guestUser.status !== "active") {
    throw new HttpException("Guest user account is not active", 403);
  }

  if (guestUser.deleted_at !== null) {
    throw new HttpException("Guest user account has been deleted", 403);
  }

  // Generate new access token with same session_id for continuity
  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const accessToken = jwt.sign(
    {
      type: "guestuser",
      id: props.guestUser.id,
      session_id: props.guestUser.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "guestuser",
      id: props.guestUser.id,
      session_id: props.guestUser.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return complete user profile with new tokens
  return {
    id: guestUser.id,
    display_name: guestUser.display_name,
    email: guestUser.email,
    bio: guestUser.bio ?? undefined,
    avatar_url: guestUser.avatar_url ?? undefined,
    status: guestUser.status,
    created_at: toISOStringSafe(guestUser.created_at),
    updated_at: toISOStringSafe(guestUser.updated_at),
    deleted_at: guestUser.deleted_at
      ? toISOStringSafe(guestUser.deleted_at)
      : undefined,
    token,
  };
}
