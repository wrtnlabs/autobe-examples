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

export async function postRedditCommunityAuthGuestJoin(props: {
  body: IRedditCommunityGuest.IJoin;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  // Generate unique UUIDs for guest and session
  const guestId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  // Create guest record
  const guest = await MyGlobal.prisma.reddit_community_guests.create({
    data: {
      id: guestId,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      deleted_at: null,
      device_id: v4() as string & tags.Format<"uuid">,
      session_token: sessionId,
      ip_address: "",
      user_agent: "",
      last_activity_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  // Create session record
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: sessionId,
      guest_id: guestId,
      ip: "",
      href: "",
      referrer: null,
      created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
    },
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "24h", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
  } as IAuthorizationToken;
  // Return IAuthorized structure
  return {
    token,
  } satisfies IRedditCommunityGuest.IAuthorized;
}
