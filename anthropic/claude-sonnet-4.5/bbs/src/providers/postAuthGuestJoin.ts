import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: IDiscussionBoardGuest.ICreate;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const guestId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4();

  const created = await MyGlobal.prisma.discussion_board_guests.create({
    data: {
      id: guestId,
      session_id: sessionId,
      email: body.email ?? null,
      ip_address: body.session_metadata?.ip_address ?? null,
      user_agent: body.session_metadata?.user_agent ?? null,
      first_visit: now,
      last_visit: now,
      page_views: 0,
      created_at: now,
      updated_at: now,
    },
  });

  const accessTokenExpiresIn = 30 * 60;
  const refreshTokenExpiresIn = 7 * 24 * 60 * 60;

  const accessToken = jwt.sign(
    {
      id: created.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTokenExpiresIn,
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: created.id,
      type: "guest",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpiresIn,
      issuer: "autobe",
    },
  );

  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + accessTokenExpiresIn * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + refreshTokenExpiresIn * 1000),
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
