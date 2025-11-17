import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";
import { IPageIRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityGuestsRedditCommunityGuestIdSessions(props: {
  admin: AdminPayload;
  redditCommunityGuestId: string & tags.Format<"uuid">;
  body: IRedditCommunityGuestSession.IRequest;
}): Promise<IPageIRedditCommunityGuestSession.ISummary> {
  const { redditCommunityGuestId, body } = props;

  const page = Math.max(1, body.page);
  const limit = Math.max(1, body.limit);
  const skip = (page - 1) * limit;

  const where = {
    reddit_community_guest_id: redditCommunityGuestId,
    ...(body.filter
      ? {
          ip: body.filter.ip ?? undefined,
          href: body.filter.url ?? undefined,
          referrer: body.filter.referrer ?? undefined,
          expired_at:
            body.filter.isActive === undefined
              ? undefined
              : body.filter.isActive
                ? null
                : { not: null },
        }
      : {}),
  };

  const orderBy = body.sortBy
    ? {
        [body.sortBy]: (body.sortOrder === "desc" ? "desc" : "asc") satisfies
          | "asc"
          | "desc",
      }
    : { created_at: "desc" as "desc" };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_guest_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_guest_sessions.count({ where }),
  ]);

  return {
    data: sessions.map((sess) => ({
      id: sess.id,
      reddit_community_guest_id: sess.reddit_community_guest_id,
      ip: sess.ip,
      href: sess.href,
      referrer: sess.referrer,
      created_at: toISOStringSafe(sess.created_at),
      expired_at: sess.expired_at ? toISOStringSafe(sess.expired_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
