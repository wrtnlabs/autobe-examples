import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: IDiscussionBoardModerator.ILogin;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  // Find moderator by email or username
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        OR: [
          { email: props.body.email_or_username },
          { username: props.body.email_or_username },
        ],
        deleted_at: null,
      },
    },
  );

  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Calculate token expiration times without Date constructor
  const now = Date.now();
  const accessExpiresMs = now + 60 * 60 * 1000;
  const refreshExpiresMs = now + 7 * 24 * 60 * 60 * 1000;

  // Create new moderator session
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_moderator_id: moderator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
        expired_at: new Date(accessExpiresMs).toISOString(),
      },
    });

  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: new Date(now).toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date(now).toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: new Date(accessExpiresMs).toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: new Date(refreshExpiresMs).toISOString() as string &
      tags.Format<"date-time">,
  };

  // Return authorized moderator information with proper null/undefined handling
  return {
    id: moderator.id,
    email: moderator.email,
    username: moderator.username,
    display_name: moderator.display_name ?? undefined,
    bio: moderator.bio ?? undefined,
    moderation_level: moderator.moderation_level,
    created_at: moderator.created_at
      ? toISOStringSafe(moderator.created_at)
      : undefined,
    updated_at: moderator.updated_at
      ? toISOStringSafe(moderator.updated_at)
      : undefined,
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
    token: token,
  };
}
