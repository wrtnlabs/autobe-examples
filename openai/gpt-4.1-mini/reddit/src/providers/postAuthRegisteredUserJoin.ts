import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postAuthRegisteredUserJoin(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunityRegisteredUser.IJoin;
}): Promise<IRedditCommunityRegisteredUser.IAuthorized> {
  const existingUser =
    await MyGlobal.prisma.reddit_community_registered_users.findFirst({
      where: { email: props.body.email },
    });

  if (existingUser !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);

  const nowDate = new Date();
  const now = toISOStringSafe(nowDate) satisfies string &
    tags.Format<"date-time"> as string & tags.Format<"date-time">;
  const newUserId = v4() satisfies string & tags.Format<"uuid"> as string &
    tags.Format<"uuid">;
  const newSessionId = v4() satisfies string & tags.Format<"uuid"> as string &
    tags.Format<"uuid">;

  const createdUser =
    await MyGlobal.prisma.reddit_community_registered_users.create({
      data: {
        id: newUserId,
        email: props.body.email,
        password_hash: hashedPassword,
        created_at: now,
        updated_at: now,
      },
    });

  const accessExpiredDate = new Date(Date.now() + 3600 * 1000);
  const accessExpiredAt = toISOStringSafe(accessExpiredDate) satisfies string &
    tags.Format<"date-time"> as string & tags.Format<"date-time">;
  const refreshExpiredDate = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const refreshExpiredAt = toISOStringSafe(
    refreshExpiredDate,
  ) satisfies string & tags.Format<"date-time"> as string &
    tags.Format<"date-time">;

  const createdSession =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.create({
      data: {
        id: newSessionId,
        reddit_community_registered_user_id: newUserId,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpiredAt,
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "registeredUser",
        id: createdUser.id,
        session_id: createdSession.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "registeredUser",
        id: createdUser.id,
        session_id: createdSession.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  return {
    id: createdUser.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">,
    email: createdUser.email,
    display_name: null,
    bio: null,
    avatar_url: null,
    status: "active",
    role: "user",
    registered_at: now,
    last_login_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    token: token,
  } satisfies IRedditCommunityRegisteredUser.IAuthorized;
}
