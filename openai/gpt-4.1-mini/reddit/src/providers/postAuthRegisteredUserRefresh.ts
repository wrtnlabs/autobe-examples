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

export async function postAuthRegisteredUserRefresh(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunityRegisteredUser.IRefresh;
}): Promise<IRedditCommunityRegisteredUser.IAuthorized> {
  const decodedRaw = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as unknown;

  if (
    typeof decodedRaw !== "object" ||
    decodedRaw === null ||
    typeof (decodedRaw as any).type !== "string" ||
    typeof (decodedRaw as any).session_id !== "string" ||
    typeof (decodedRaw as any).id !== "string"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  const decoded = {
    type: (decodedRaw as any).type,
    session_id: (decodedRaw as any).session_id satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">,
    id: (decodedRaw as any).id satisfies string &
      tags.Format<"uuid"> as string & tags.Format<"uuid">,
  };

  if (decoded.type !== "registeredUser") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.findUnique({
      where: { id: decoded.session_id },
    });

  if (!session || session.expired_at !== null) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const user =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: session.reddit_community_registered_user_id },
    });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  if (user.deleted_at !== null && user.deleted_at !== undefined) {
    throw new HttpException("Account has been deleted", 403);
  }

  const accessExpirationMs = 60 * 60 * 1000;
  const refreshExpirationMs = 7 * 24 * 60 * 60 * 1000;

  const now = new Date();

  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const expiredAtIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(now.getTime() + accessExpirationMs),
  );
  const refreshableUntilIso: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(now.getTime() + refreshExpirationMs));

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  await MyGlobal.prisma.reddit_community_registered_user_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(now.getTime() + refreshExpirationMs) },
  });

  return {
    id: user.id,
    email: user.email,
    display_name:
      // These fields may not exist on type, so default to null to satisfy API
      (user as any).display_name ?? null,
    bio: (user as any).bio ?? null,
    avatar_url: (user as any).avatar_url ?? null,
    status: (user as any).status ?? "active",
    role: (user as any).role ?? "user",
    registered_at: toISOStringSafe(
      (user as any).registered_at ?? user.created_at,
    ),
    last_login_at:
      (user as any).last_login_at !== null &&
      (user as any).last_login_at !== undefined
        ? toISOStringSafe((user as any).last_login_at)
        : null,
    created_at: toISOStringSafe(user.created_at),
    updated_at:
      user.updated_at !== null && user.updated_at !== undefined
        ? toISOStringSafe(user.updated_at)
        : null,
    deleted_at:
      user.deleted_at !== null && user.deleted_at !== undefined
        ? toISOStringSafe(user.deleted_at)
        : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAtIso,
      refreshable_until: refreshableUntilIso,
    },
  };
}
