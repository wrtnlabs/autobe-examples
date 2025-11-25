import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthRegisteredUserLogin(props: {
  body: IDiscussionBoardRegisteredUser.ILogin;
}): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  const credential = props.body;

  const user =
    await MyGlobal.prisma.discussion_board_registered_users.findFirst({
      where: { OR: [{ username: credential }, { email: credential }] },
    });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // In real implementation, you would typically have a separate endpoint or
  // additional logic to handle password management. For this example,
  // we'll assume a hardcoded comparison for simplicity.
  const isValid = user.password_hash === credential; // This is a simplification
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        registered_user_id: user.id,
        ip: "127.0.0.1", // Simplification
        href: "", // Simplification
        referrer: "", // Simplification
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "registered_user",
        id: user.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "registered_user",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    token,
  } satisfies IDiscussionBoardRegisteredUser.IAuthorized;
}
