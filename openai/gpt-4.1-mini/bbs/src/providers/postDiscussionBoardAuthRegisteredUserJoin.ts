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

export async function postDiscussionBoardAuthRegisteredUserJoin(props: {
  body: IDiscussionBoardRegisteredUser.IJoin;
}): Promise<IDiscussionBoardRegisteredUser.IAuthorized> {
  // Destructure props.body with type assertion to any to access required properties
  const body = props.body as any;
  // 1. Check for duplicate email
  const existingUser =
    await MyGlobal.prisma.discussion_board_registered_users.findFirst({
      where: { email: body.email },
    });
  if (existingUser) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Getting current datetime as ISO string & tags.Format<'date-time'>
  const now = toISOStringSafe(new Date());
  // 3. Create the new registered user
  const createdUser =
    await MyGlobal.prisma.discussion_board_registered_users.create({
      data: {
        id: v4(),
        email: body.email,
        password_hash: await PasswordUtil.hash(body.password),
        display_name: body.display_name,
        bio: body.bio ?? null,
        is_banned: false,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  // 4. Compute expiration dates for access and refresh tokens as strings
  const accessExpiresString = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresString = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 5. Create a new session
  const createdSession =
    await MyGlobal.prisma.discussion_board_registered_user_sessions.create({
      data: {
        id: v4(),
        registered_user_id: createdUser.id,
        ip: "",
        href: "",
        referrer: "",
        created_at: now,
        expired_at: accessExpiresString,
      },
    });
  // 6. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "registereduser",
        id: createdUser.id,
        session_id: createdSession.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "registereduser",
        id: createdUser.id,
        session_id: createdSession.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresString,
    refreshable_until: refreshExpiresString,
  };
  // 7. Return the result in IAuthorized shape
  return {
    token,
  };
}
