import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSession";
import { IPageIRedditCommunityAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityAdminsRedditCommunityAdminIdSessions(props: {
  admin: AdminPayload;
  redditCommunityAdminId: string & tags.Format<"uuid">;
  body: IRedditCommunityAdminSession.IRequest;
}): Promise<IPageIRedditCommunityAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    reddit_community_admin_id: props.redditCommunityAdminId,
    ip: props.body.filterIp ?? undefined,
    href: props.body.filterHrefContains
      ? { contains: props.body.filterHrefContains }
      : undefined,
    referrer: props.body.filterReferrerContains
      ? { contains: props.body.filterReferrerContains }
      : undefined,
    created_at:
      props.body.filterCreatedAtFrom || props.body.filterCreatedAtTo
        ? {
            ...(props.body.filterCreatedAtFrom
              ? { gte: props.body.filterCreatedAtFrom }
              : {}),
            ...(props.body.filterCreatedAtTo
              ? { lte: props.body.filterCreatedAtTo }
              : {}),
          }
        : undefined,
    expired_at:
      props.body.filterExpiredAtFrom || props.body.filterExpiredAtTo
        ? {
            ...(props.body.filterExpiredAtFrom
              ? { gte: props.body.filterExpiredAtFrom }
              : {}),
            ...(props.body.filterExpiredAtTo
              ? { lte: props.body.filterExpiredAtTo }
              : {}),
          }
        : undefined,
  };

  const orderBy = props.body.sortBy
    ? {
        [props.body.sortBy]: props.body.sortOrder ?? "asc",
      }
    : { created_at: "desc" as "desc" | "asc" };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_admin_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.reddit_community_admin_sessions.count({ where }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      reddit_community_admin_id: session.reddit_community_admin_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
