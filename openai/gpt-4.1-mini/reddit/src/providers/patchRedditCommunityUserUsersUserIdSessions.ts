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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchRedditCommunityUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityUserSession.IRequest;
}): Promise<IPageIRedditCommunityUserSession.ISummary> {
  const { user, userId, body } = props;

  if (user.id !== userId) {
    throw new HttpException(
      "Forbidden: Access denied to other user sessions",
      403,
    );
  }

  const page = body.page > 0 ? body.page : 1;
  const limit = body.limit > 0 ? body.limit : 10;
  const skip = (page - 1) * limit;

  const whereConditions = {
    reddit_community_user_id: userId,
    expired_at: null,
  } as const;

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
  ) {
    Object.assign(whereConditions, {
      OR: [
        { ip: { contains: body.search } },
        { href: { contains: body.search } },
        { referrer: { contains: body.search } },
      ],
    });
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_user_sessions.findMany({
      where: whereConditions,
      orderBy: {
        [body.orderBy === "expired_at" ? "expired_at" : "created_at"]:
          body.orderDirection === "asc" ? "asc" : "desc",
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_user_sessions.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((s) => ({
      id: s.id,
      ip: s.ip,
      href: s.href,
      referrer: s.referrer,
      created_at: toISOStringSafe(s.created_at),
    })),
  };
}
