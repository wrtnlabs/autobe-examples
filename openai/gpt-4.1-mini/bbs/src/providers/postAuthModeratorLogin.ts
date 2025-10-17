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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorLogin(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.ILogin;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body } = props;

  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        email: body.email,
        deleted_at: null,
      },
    },
  );

  if (!moderator) {
    throw new HttpException("Invalid email or password", 400);
  }

  const validPassword = await PasswordUtil.verify(
    body.password,
    moderator.password_hash,
  );
  if (!validPassword) {
    throw new HttpException("Invalid email or password", 400);
  }

  const now = Date.now();
  const accessExpireAt = toISOStringSafe(new Date(now + 3600000)); // 1 hour later
  const refreshExpireAt = toISOStringSafe(new Date(now + 604800000)); // 7 days later

  const accessToken = jwt.sign(
    {
      id: moderator.id,
      email: moderator.email,
      display_name: moderator.display_name,
      type: "moderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: moderator.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: moderator.id,
    email: moderator.email,
    display_name: moderator.display_name,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireAt,
      refreshable_until: refreshExpireAt,
    },
  };
}
