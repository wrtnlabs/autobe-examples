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
  const now = toISOStringSafe(new Date());
  const whereInput: Prisma.reddit_like_guest_sessionsWhereInput = {
    reddit_like_guest_id: props.guest.id,
  };
  if (props.body.activeOnly === true) {
    whereInput.expired_at = {
      gt: now,
    };
  }
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (
    props.body.dateRangeStart !== undefined &&
    props.body.dateRangeStart !== null
  ) {
    createdAtFilter.gte = props.body.dateRangeStart;
  }
  if (
    props.body.dateRangeEnd !== undefined &&
    props.body.dateRangeEnd !== null
  ) {
    createdAtFilter.lte = props.body.dateRangeEnd;
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  if (props.body.ipAddress !== undefined && props.body.ipAddress !== null) {
    whereInput.ip = {
      contains: props.body.ipAddress,
    };
  }
  const total = await MyGlobal.prisma.reddit_like_guest_sessions.count({
    where: whereInput,
  });
  const sessions = await MyGlobal.prisma.reddit_like_guest_sessions.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      guest: {
        select: {
          id: true,
          device_fingerprint: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          sessions: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  const data: IRedditLikeMemberSession.ISummary[] = await Promise.all(
    sessions.map(async (session) => {
      const isActive =
        session.expired_at === null ||
        toISOStringSafe(session.expired_at) > now;
      return {
        id: session.id,
        actorType: "guest" as const,
        user: {
          id: session.guest.id,
          device_fingerprint: session.guest.device_fingerprint,
          created_at: toISOStringSafe(session.guest.created_at),
          updated_at: toISOStringSafe(session.guest.updated_at),
          deleted_at: session.guest.deleted_at
            ? toISOStringSafe(session.guest.deleted_at)
            : null,
          session_count: session.guest.sessions.length,
        } satisfies IRedditLikeGuest.ISummary,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        userAgent: null,
        createdAt: toISOStringSafe(session.created_at),
        expiredAt: session.expired_at
          ? toISOStringSafe(session.expired_at)
          : null,
        isActive: isActive,
      };
    }),
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
