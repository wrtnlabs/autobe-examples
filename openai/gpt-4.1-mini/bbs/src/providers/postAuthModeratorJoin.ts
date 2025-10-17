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

export async function postAuthModeratorJoin(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerator.ICreate;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body } = props;

  const existing = await MyGlobal.prisma.discussion_board_moderators.findUnique(
    {
      where: { email: body.email },
    },
  );
  if (existing !== null) {
    throw new HttpException("Email already in use", 409);
  }

  const hashedPassword = await PasswordUtil.hash(body.password);

  const nowISO = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_moderators.create({
    data: {
      id: v4() satisfies string & tags.Format<"uuid">,
      email: body.email,
      password_hash: hashedPassword,
      display_name: body.display_name,
      created_at: nowISO,
      updated_at: nowISO,
      deleted_at: null,
    },
  });

  const accessTokenExpiresAt = toISOStringSafe(
    new Date(Date.now() + 3600 * 1000),
  );
  const refreshTokenExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "moderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: created.id,
    email: created.email,
    display_name: created.display_name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiresAt,
      refreshable_until: refreshTokenExpiresAt,
    },
  };
}
