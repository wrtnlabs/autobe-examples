import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberSession";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestSessions(props: {
  guest: GuestPayload;
  body: IRedditLikeMemberSession.IRequest;
}): Promise<IPageIRedditLikeMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // For guest actor, only query guest's own sessions
  // Guest authorization restricts to the authenticated guest
  const whereInput: Prisma.reddit_like_guest_sessionsWhereInput = {
    reddit_like_guest_id: props.guest.id,
  };
  // Apply date range filters
  if (
    props.body.dateRangeStart !== null &&
    props.body.dateRangeStart !== undefined
  ) {
    whereInput.created_at = {
      gte: new Date(props.body.dateRangeStart),
    };
  }
  if (
    props.body.dateRangeEnd !== null &&
    props.body.dateRangeEnd !== undefined
  ) {
    whereInput.created_at = {
      ...(whereInput.created_at as Prisma.DateTimeFilter | undefined),
      lte: new Date(props.body.dateRangeEnd),
    };
  }
  // Apply IP address filter
  if (props.body.ipAddress !== null && props.body.ipAddress !== undefined) {
    whereInput.ip = {
      contains: props.body.ipAddress,
    };
  }
  // Apply active only filter
  if (props.body.activeOnly === true) {
    whereInput.OR = [
      { expired_at: { gt: new Date() } },
      { expired_at: { equals: null } as unknown as Prisma.DateTimeFilter },
    ];
  }
  // Fetch sessions paginated
  const sessions = await MyGlobal.prisma.reddit_like_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reddit_like_guest_id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    } satisfies Prisma.reddit_like_guest_sessionsSelect,
  });
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_guest_sessions.count({
    where: whereInput,
  });
  // Fetch the guest user details once
  const guestEntity =
    await MyGlobal.prisma.reddit_like_guests.findUniqueOrThrow({
      where: { id: props.guest.id },
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      } satisfies Prisma.reddit_like_guestsSelect,
    });
  const sessionCount = await MyGlobal.prisma.reddit_like_guest_sessions.count({
    where: {
      reddit_like_guest_id: { in: [props.guest.id] },
    },
  });
  const userSummary: IRedditLikeGuest.ISummary = {
    id: guestEntity.id,
    device_fingerprint: guestEntity.device_fingerprint,
    created_at: toISOStringSafe(guestEntity.created_at),
    updated_at: toISOStringSafe(guestEntity.updated_at),
    deleted_at: guestEntity.deleted_at
      ? toISOStringSafe(guestEntity.deleted_at)
      : null,
    session_count: sessionCount,
  } satisfies IRedditLikeGuest.ISummary;
  // Transform sessions to the response format
  const sessionData = await ArrayUtil.asyncMap(
    sessions,
    async (session): Promise<IRedditLikeMemberSession.ISummary> => {
      const isActive =
        session.expired_at === null
          ? true
          : new Date(session.expired_at) > new Date();
      return {
        id: session.id,
        actorType: "guest",
        user: userSummary,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        userAgent: null,
        createdAt: toISOStringSafe(session.created_at),
        expiredAt: session.expired_at
          ? toISOStringSafe(session.expired_at)
          : null,
        isActive: isActive,
      } satisfies IRedditLikeMemberSession.ISummary;
    },
  );
  return {
    data: sessionData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
