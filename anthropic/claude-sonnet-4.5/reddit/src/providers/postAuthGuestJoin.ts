import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: IRedditLikeGuest.ICreate;
}): Promise<IRedditLikeGuest.IAuthorized> {
  const { body } = props;

  const guestId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4();
  const now = toISOStringSafe(new Date());

  const createdGuest = await MyGlobal.prisma.reddit_like_guests.create({
    data: {
      id: guestId,
      session_identifier: sessionId,
      ip_address: body.ip_address ?? undefined,
      user_agent: body.user_agent ?? undefined,
      first_visit_at: now,
      last_visit_at: now,
      created_at: now,
      updated_at: now,
    },
  });

  const accessTokenExpiresIn = 30 * 60;
  const refreshTokenExpiresIn = 30 * 24 * 60 * 60;

  const accessToken = jwt.sign(
    {
      id: guestId,
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
      id: guestId,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpiresIn,
      issuer: "autobe",
    },
  );

  const accessTokenExpiredAt = toISOStringSafe(
    new Date(Date.now() + accessTokenExpiresIn * 1000),
  );
  const refreshTokenExpiredAt = toISOStringSafe(
    new Date(Date.now() + refreshTokenExpiresIn * 1000),
  );

  return {
    id: createdGuest.id as string & tags.Format<"uuid">,
    session_identifier: createdGuest.session_identifier,
    role: "guest",
    first_visit_at: toISOStringSafe(createdGuest.first_visit_at),
    last_visit_at: toISOStringSafe(createdGuest.last_visit_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiredAt,
      refreshable_until: refreshTokenExpiredAt,
    },
  };
}
