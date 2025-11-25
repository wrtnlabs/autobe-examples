import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestJoin(props: {
  body: IEconomicDiscussionGuest.ICreate;
}): Promise<IEconomicDiscussionGuest.IAuthorized> {
  // Get current timestamp as ISO string
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  ); // 24 hours
  const sessionExpires = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  ); // 24 hours

  // Extract IP from execution context - NestJS provides this through the request
  // For guest operations, we use a default IP since this is a public endpoint
  const ip = "127.0.0.1"; // This would be extracted from request context in production

  // Check for existing guest with same IP and user_agent combination
  const existingGuest =
    await MyGlobal.prisma.economic_discussion_guests.findFirst({
      where: {
        ip_address: ip,
        user_agent: props.body.user_agent ?? null,
      },
    });

  let guestId: string & tags.Format<"uuid">;
  let guestUsername: string;
  let guestCreatedAt: string & tags.Format<"date-time">;
  let guestLastActivityAt: string & tags.Format<"date-time">;
  let articlesCount: number;
  let downloadsCount: number;

  if (existingGuest) {
    // Update existing guest activity
    const updatedGuest =
      await MyGlobal.prisma.economic_discussion_guests.update({
        where: { id: existingGuest.id },
        data: {
          last_activity_at: now,
        },
      });

    guestId = updatedGuest.id;
    guestUsername = updatedGuest.username;
    guestCreatedAt = toISOStringSafe(updatedGuest.created_at);
    guestLastActivityAt = toISOStringSafe(updatedGuest.last_activity_at);
    articlesCount = updatedGuest.articles_viewed_count;
    downloadsCount = updatedGuest.downloads_count;
  } else {
    // Create new guest account
    guestId = v4() as string & tags.Format<"uuid">;

    const guest = await MyGlobal.prisma.economic_discussion_guests.create({
      data: {
        id: guestId,
        username: props.body.username,
        ip_address: ip,
        user_agent: props.body.user_agent ?? null,
        created_at: now,
        last_activity_at: now,
        articles_viewed_count: 0,
        downloads_count: 0,
      },
    });

    guestUsername = guest.username;
    guestCreatedAt = guestCreatedAt = toISOStringSafe(guest.created_at);
    guestLastActivityAt = toISOStringSafe(guest.last_activity_at);
    articlesCount = guest.articles_viewed_count;
    downloadsCount = guest.downloads_count;
  }

  // Create guest session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const session =
    await MyGlobal.prisma.economic_discussion_guest_sessions.create({
      data: {
        id: sessionId,
        economic_discussion_guest_id: guestId,
        ip: ip,
        href: "", // Would be extracted from request context
        referrer: null,
        created_at: now,
        expired_at: sessionExpires,
      },
    });

  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
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
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "24h",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: guestId,
    username: guestUsername,
    created_at: guestCreatedAt,
    last_activity_at: guestLastActivityAt,
    articles_viewed_count: articlesCount,
    downloads_count: downloadsCount,
    token,
  };
}
