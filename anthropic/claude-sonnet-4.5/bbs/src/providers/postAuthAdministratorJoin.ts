import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdministratorJoin(props: {
  body: IDiscussionBoardAdministrator.ICreate;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  const { body } = props;

  const existingUsername =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: { username: body.username },
    });

  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  const existingEmail =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: { email: body.email },
    });

  if (existingEmail) {
    throw new HttpException("Email already exists", 409);
  }

  const hashedPassword = await PasswordUtil.hash(body.password);

  const now = toISOStringSafe(new Date());
  const administratorId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.discussion_board_administrators.create({
    data: {
      id: administratorId,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      email_verified: false,
      account_status: "pending_verification",
      is_super_admin: false,
      created_at: now,
      updated_at: now,
    },
  });

  const accessTokenExpiration = new Date();
  accessTokenExpiration.setHours(accessTokenExpiration.getHours() + 1);
  const accessExpiredAt = toISOStringSafe(accessTokenExpiration);

  const refreshTokenExpiration = new Date();
  refreshTokenExpiration.setDate(refreshTokenExpiration.getDate() + 7);
  const refreshableUntil = toISOStringSafe(refreshTokenExpiration);

  const accessToken = jwt.sign(
    {
      id: created.id,
      email: created.email,
      type: "administrator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
