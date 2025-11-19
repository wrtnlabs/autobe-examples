import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: IDiscussionBoardModerator.ICreate;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  // Check for existing moderator with same email or username
  const existingModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        OR: [{ email: props.body.email }, { username: props.body.username }],
      },
    });

  if (existingModerator) {
    if (existingModerator.email === props.body.email) {
      throw new HttpException("Email already registered", 409);
    }
    if (existingModerator.username === props.body.username) {
      throw new HttpException("Username already taken", 409);
    }
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create moderator record
  const moderatorId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const moderator = await MyGlobal.prisma.discussion_board_moderators.create({
    data: {
      id: moderatorId,
      email: props.body.email,
      username: props.body.username,
      password_hash: hashedPassword,
      display_name: props.body.display_name ?? null,
      bio: props.body.bio ?? null,
      moderation_level: props.body.moderation_level,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.create({
      data: {
        id: sessionId,
        discussion_board_moderator_id: moderatorId,
        ip: props.body.ip ?? "unknown",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        updated_at: now,
        expired_at: toISOStringSafe(accessExpires),
        deleted_at: null,
      },
    });

  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderatorId,
        session_id: sessionId,
        created_at: now,
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
        id: moderatorId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return authorized response
  return {
    id: moderatorId,
    email: moderator.email,
    username: moderator.username,
    display_name: moderator.display_name ?? undefined,
    bio: moderator.bio ?? undefined,
    moderation_level: moderator.moderation_level,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : undefined,
    token,
  };
}
