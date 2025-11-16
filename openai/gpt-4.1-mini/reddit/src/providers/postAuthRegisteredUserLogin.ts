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

export async function postAuthRegisteredUserLogin(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunityRegisteredUser.ILogin;
}): Promise<IRedditCommunityRegisteredUser.IAuthorized> {
  const user =
    await MyGlobal.prisma.reddit_community_registered_users.findFirst({
      where: { email: props.body.email },
    });
  if (user === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const validPassword = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!validPassword) {
    throw new HttpException("Invalid credentials", 401);
  }

  const nowIso = toISOStringSafe(new Date());
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_registered_user_id: user.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowIso,
        expired_at: accessExpiresIso,
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "registeredUser",
        id: user.id,
        session_id: session.id,
        created_at: nowIso,
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
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  return {
    id: user.id,
    email: user.email,
    registered_at: toISOStringSafe(user.created_at),
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null ? toISOStringSafe(user.deleted_at) : null,
    token,
    status: "active" as "active" | "inactive" | "banned",
    role: "registeredUser" as "registeredUser" | "admin" | "moderator",
  } satisfies IRedditCommunityRegisteredUser.IAuthorized;
}
