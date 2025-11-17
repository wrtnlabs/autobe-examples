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
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postAuthRegisteredUserRefresh(props: {
  registeredUser: RegistereduserPayload;
  body: IRedditCommunityRegisteredUser.IRequestRefresh;
}): Promise<IRedditCommunityRegisteredUser.IAuthorized> {
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "registereduser";
  };

  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    decoded = typia.assert<{
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "registereduser";
    }>(verified as unknown);
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "registereduser") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.reddit_community_registereduser_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_registereduser_id: decoded.id,
        expired_at: null,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const user =
    await MyGlobal.prisma.reddit_community_registeredusers.findUnique({
      where: { id: decoded.id },
    });

  if (!user || user.deleted_at !== null) {
    throw new HttpException("Account inactive or deleted", 403);
  }

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const tokenAccess = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const tokenRefresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  await MyGlobal.prisma.reddit_community_registereduser_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });

  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at === null ? null : undefined,
    token: {
      access: tokenAccess,
      refresh: tokenRefresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
