import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthRegisteredUserLogin(props: {
  body: IDiscussionBoardRegisteredUser.ILogin;
}): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  // cast props.body to allow use of email, password, ip, href, referrer
  const body = typia.assert<{
    email: string;
    password: string;
    ip?: string | null;
    href?: string | null;
    referrer?: string | null;
  }>(props.body);
  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findFirst({
      where: { email: body.email },
      select: {
        id: true,
        password_hash: true,
        is_banned: true,
      },
    });
  if (!user || user.is_banned) {
    throw new HttpException("Invalid credentials or banned user", 401);
  }
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );
  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const nowISOString = toISOStringSafe(new Date());
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Calculate expiration timestamps without native Date usage
  const accessExpiresISOString = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresISOString = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.create({
      data: {
        id: sessionId,
        registered_user_id: user.id,
        ip: (body.ip ?? "") || "",
        href: (body.href ?? "") || "",
        referrer: (body.referrer ?? "") || "",
        created_at: nowISOString,
        expired_at: accessExpiresISOString,
      },
    });
  const token = {
    access: jwt.sign(
      {
        type: "registereduser",
        id: user.id,
        session_id: sessionId,
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "registereduser",
        id: user.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowISOString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresISOString,
    refreshable_until: refreshExpiresISOString,
  };
  return { token };
}
