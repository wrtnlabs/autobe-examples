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
  // Phase 1: Validate moderator credentials (MANDATORY)
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: { email: props.body.email },
    },
  );

  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check account status
  if (!moderator.is_active) {
    throw new HttpException("Invalid credentials", 401);
  }

  if (moderator.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password (MANDATORY)
  const isValid = await PasswordUtil.verify(
    props.body.password,
    moderator.password,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Phase 2: Update last login timestamp (ADDITIONAL BUSINESS LOGIC)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const updatedModerator =
    await MyGlobal.prisma.discussion_board_moderators.update({
      where: { id: moderator.id },
      data: {
        last_login_at: now,
      },
    });

  // Phase 3: Create new session record (MANDATORY)
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_moderator_id: moderator.id,
        ip: props.body.ip ?? "unknown",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    });

  // Phase 4: Generate JWT tokens (MANDATORY)
  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
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

  // Phase 5: Return authorized moderator response
  return {
    id: updatedModerator.id,
    email: updatedModerator.email,
    username: updatedModerator.username,
    display_name:
      updatedModerator.display_name === null
        ? undefined
        : updatedModerator.display_name,
    email_verified: updatedModerator.email_verified,
    email_verified_at:
      updatedModerator.email_verified_at === null
        ? undefined
        : toISOStringSafe(updatedModerator.email_verified_at),
    is_active: updatedModerator.is_active,
    last_login_at:
      updatedModerator.last_login_at === null
        ? undefined
        : toISOStringSafe(updatedModerator.last_login_at),
    created_at: toISOStringSafe(updatedModerator.created_at),
    updated_at: toISOStringSafe(updatedModerator.updated_at),
    deleted_at:
      updatedModerator.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedModerator.deleted_at),
    token,
  };
}
