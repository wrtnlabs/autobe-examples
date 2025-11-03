import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";
import { IPageIRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminUsersUserIdSessions(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityUserSession.IRequest;
}): Promise<IPageIRedditCommunityUserSession.ISummary> {
  const { admin, userId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const where: Prisma.reddit_community_user_sessionsWhereInput = {
    reddit_community_user_id: userId,
    ...(body.search !== undefined && body.search !== null
      ? {
          OR: [
            { ip: { contains: body.search } },
            { href: { contains: body.search } },
            { referrer: { contains: body.search } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.reddit_community_user_sessionsOrderByWithRelationInput =
    body.orderBy === "created_at"
      ? { created_at: body.orderDirection === "asc" ? "asc" : "desc" }
      : body.orderBy === "expired_at"
        ? { expired_at: body.orderDirection === "asc" ? "asc" : "desc" }
        : { created_at: "desc" };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_user_sessions.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_user_sessions.count({ where }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
