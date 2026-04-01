import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeMemberTransformer } from "../transformers/RedditLikeMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthMemberLogin(props: {
  ip: string;
  body: IRedditLikeMember.ILogin;
}): Promise<IRedditLikeMember.IAuthorized> {
  const member = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...RedditLikeMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const now = Date.now();
  const accessExpiresAt = new Date(now + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_like_member_sessions.create({
    data: {
      id: sessionId,
      reddit_like_member_id: member.id,
      access_token_hash: accessToken,
      refresh_token_hash: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      user_agent: "",
      created_at: new Date(now),
      expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpiresAt.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    ...(await RedditLikeMemberTransformer.transform(member)),
    token,
  } satisfies IRedditLikeMember.IAuthorized;
}
