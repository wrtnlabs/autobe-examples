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

  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.discussion_board_guests.create({
    data: {
      id: newId,
      session_token: body.session_token,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  const accessExpiry = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshExpiry = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const accessToken = jwt.sign(
    {
      sub: created.id,
      session_token: created.session_token,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      sub: created.id,
      token_type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiry,
      refreshable_until: refreshExpiry,
    },
  };
}
