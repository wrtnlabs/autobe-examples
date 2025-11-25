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

export async function postAuthModeratorJoin(props: {
  body: IDiscussionBoardModerator.ICreate;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  // 1. Check for duplicate email or username
  const existingModerator =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        OR: [{ email: props.body.email }, { username: props.body.username }],
      },
    });

  if (existingModerator) {
    if (existingModerator.email === props.body.email) {
      throw new HttpException("Email address is already registered", 409);
    }
    throw new HttpException("Username is already taken", 409);
  }

  // 2. Hash the password
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  // 3. Create moderator actor record
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpiresMs: number = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs: number = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const moderator = await MyGlobal.prisma.discussion_board_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password: hashedPassword,
      username: props.body.username,
      display_name: props.body.display_name ?? null,
      email_verified: false,
      email_verified_at: null,
      is_active: true,
      last_login_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 4. Create session record
  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_moderator_id: moderator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: toISOStringSafe(new Date(accessExpiresMs)),
      },
    });

  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
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
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(new Date(accessExpiresMs)),
    refreshable_until: toISOStringSafe(new Date(refreshExpiresMs)),
  };

  // 6. Return authorized moderator response
  return {
    id: moderator.id,
    email: moderator.email,
    username: moderator.username,
    display_name: moderator.display_name ?? null,
    email_verified: moderator.email_verified,
    email_verified_at: moderator.email_verified_at
      ? toISOStringSafe(moderator.email_verified_at)
      : null,
    is_active: moderator.is_active,
    last_login_at: moderator.last_login_at
      ? toISOStringSafe(moderator.last_login_at)
      : null,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
    token,
  };
}
