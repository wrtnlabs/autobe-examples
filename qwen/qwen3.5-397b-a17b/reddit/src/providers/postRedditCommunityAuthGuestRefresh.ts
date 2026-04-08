import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthGuestRefresh(props: {
  body: IRedditCommunityGuest.IRefresh;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: jwt.JwtPayload | string;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token payload with typia (no 'as' assertions)
  const tokenPayload = typia.assert<{
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
  }>(decoded);
  // 3. Validate session exists
  const session =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: tokenPayload.session_id,
        reddit_community_guest_id: tokenPayload.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session expiration
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Validate guest is not deleted
  const guest = await MyGlobal.prisma.reddit_community_guests.findUniqueOrThrow(
    {
      where: { id: tokenPayload.id },
    },
  );
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 6. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: tokenPayload.type,
        id: tokenPayload.id,
        session_id: tokenPayload.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: tokenPayload.type,
        id: tokenPayload.id,
        session_id: tokenPayload.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Update session expiration
  await MyGlobal.prisma.reddit_community_guest_sessions.update({
    where: { id: tokenPayload.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Return authorized guest info
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token,
  } satisfies IRedditCommunityGuest.IAuthorized;
}
