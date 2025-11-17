import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";
import { IPageIRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorRedditCommunityModeratorsRedditCommunityModeratorIdSessions(props: {
  moderator: ModeratorPayload;
  redditCommunityModeratorId: string & tags.Format<"uuid">;
  body: IRedditCommunityModeratorSession.IRequest;
}): Promise<IPageIRedditCommunityModeratorSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereClause = {
    reddit_community_moderator_id: props.redditCommunityModeratorId,
    ...(props.body.search ? { ip: { contains: props.body.search } } : {}),
  };

  const orderByClause = {
    [props.body.orderBy ?? "created_at"]: props.body.orderDirection ?? "desc",
  } as const;

  const [sessions, totalCount] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderator_sessions.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
    }),
    MyGlobal.prisma.reddit_community_moderator_sessions.count({
      where: whereClause,
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  };
}
