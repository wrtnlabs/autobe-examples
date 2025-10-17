import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAuthSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAuthSession";

export async function postRedditLikeAuthSessionValidate(props: {
  body: IRedditLikeAuthSession.IValidate;
}): Promise<IRedditLikeAuthSession.IValidationResult> {
  const { body } = props;

  // Find session by access token
  const session = await MyGlobal.prisma.reddit_like_sessions.findFirst({
    where: {
      access_token: body.access_token,
      deleted_at: null,
    },
    include: {
      user: true,
    },
  });

  // If session not found or revoked, return invalid
  if (!session) {
    return {
      valid: false,
      user_id: undefined,
      username: undefined,
      role: undefined,
      expires_at: undefined,
    };
  }

  // Check if token has expired by comparing timestamps
  const currentTime = new Date();
  const expirationTime = new Date(session.access_token_expires_at);
  const tokenExpired = expirationTime <= currentTime;

  if (tokenExpired) {
    return {
      valid: false,
      user_id: undefined,
      username: undefined,
      role: undefined,
      expires_at: undefined,
    };
  }

  // Check if user account is deleted
  if (session.user.deleted_at !== null) {
    return {
      valid: false,
      user_id: undefined,
      username: undefined,
      role: undefined,
      expires_at: undefined,
    };
  }

  // Check for active platform suspension
  const activeSuspension =
    await MyGlobal.prisma.reddit_like_platform_suspensions.findFirst({
      where: {
        suspended_member_id: session.user.id,
        is_active: true,
        deleted_at: null,
      },
    });

  if (activeSuspension) {
    return {
      valid: false,
      user_id: undefined,
      username: undefined,
      role: undefined,
      expires_at: undefined,
    };
  }

  // Token is valid, return user information
  return {
    valid: true,
    user_id: session.user.id as string & tags.Format<"uuid">,
    username: session.user.username,
    role: session.user.role,
    expires_at: toISOStringSafe(session.access_token_expires_at),
  };
}
