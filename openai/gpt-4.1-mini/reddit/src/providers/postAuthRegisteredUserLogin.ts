import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postAuthRegisteredUserLogin(props: {
  registeredUser: RegistereduserPayload;
  body: IRedditCommunityRegisteredUser.ILogin;
}): Promise<IRedditCommunityRegisteredUser.IAuthorized> {
  const user = await MyGlobal.prisma.reddit_community_registeredusers.findFirst(
    {
      where: { email: props.body.email, deleted_at: null },
    },
  );

  if (user === null) {
    throw new HttpException("Invalid credentials", 401);
  }

  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!isPasswordValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.reddit_community_registereduser_sessions.create({
      data: {
        id: v4(),
        reddit_community_registereduser_id: user.id,
        ip: (props.body.ip ?? "") satisfies string as string,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowIso,
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "registereduser",
        id: user.id,
        session_id: session.id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "registereduser",
        id: user.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    token,
  };
}
