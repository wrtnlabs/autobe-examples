import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IDiscussionBoardGuest.IRefresh;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "guest";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const guest = await MyGlobal.prisma.discussion_board_guests.findUnique({
    where: {
      id: decoded.id,
    },
  });

  if (!guest) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const nowTimestamp = Date.now();
  const nowISO = new Date(nowTimestamp).toISOString();
  const accessExpiresISO = new Date(
    nowTimestamp + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiresISO = new Date(
    nowTimestamp + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const updated = await MyGlobal.prisma.discussion_board_guests.update({
    where: {
      id: guest.id,
    },
    data: {
      last_visit_at: new Date(nowTimestamp),
    },
  });

  return {
    id: updated.id,
    session_identifier: updated.session_identifier,
    ip_address: updated.ip_address,
    user_agent: updated.user_agent,
    first_visit_at: toISOStringSafe(updated.first_visit_at),
    last_visit_at: toISOStringSafe(updated.last_visit_at),
    page_views: updated.page_views,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresISO as string & tags.Format<"date-time">,
      refreshable_until: refreshExpiresISO as string & tags.Format<"date-time">,
    },
  };
}
