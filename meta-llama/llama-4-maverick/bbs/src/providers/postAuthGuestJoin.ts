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
  const guestId = v4() as string & tags.Format<"uuid">;
  const guest = await MyGlobal.prisma.discussion_board_guests.create({
    data: {
      id: guestId,
      ip: props.body,
      created_at: toISOStringSafe(new Date()),
    },
  });

  const accessExpires = Date.now() + 60 * 60 * 1000;
  const refreshExpires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      ip: guest.ip,
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
      type: "guest",
      id: guest.id,
      ip: guest.ip,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(new Date(accessExpires)),
    refreshable_until: toISOStringSafe(new Date(refreshExpires)),
  };

  return {
    expiresIn: 3600,
    guestId,
    token,
  };
}
