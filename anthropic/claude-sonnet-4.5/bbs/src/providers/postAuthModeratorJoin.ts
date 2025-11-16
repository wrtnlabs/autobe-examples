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
  const existingByEmail =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: { email: props.body.email },
    });

  if (existingByEmail) {
    throw new HttpException("Email already registered", 409);
  }

  const existingByUsername =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: { username: props.body.username },
    });

  if (existingByUsername) {
    throw new HttpException("Username already taken", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const moderator = await MyGlobal.prisma.discussion_board_moderators.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      username: props.body.username,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.create({
      data: {
        id: v4(),
        discussion_board_moderator_id: moderator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    });

  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: moderator.id,
    username: moderator.username,
    email: moderator.email,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
