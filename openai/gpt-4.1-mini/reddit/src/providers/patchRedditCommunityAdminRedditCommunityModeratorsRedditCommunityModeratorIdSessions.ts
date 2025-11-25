import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";
import { IPageIRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityModeratorsRedditCommunityModeratorIdSessions(props: {
  admin: AdminPayload;
  redditCommunityModeratorId: string & tags.Format<"uuid">;
  body: IRedditCommunityModeratorSession.IRequest;
}): Promise<IPageIRedditCommunityModeratorSession.ISummary> {
  // Verify moderator existence
  const moderator =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: { id: props.redditCommunityModeratorId },
    });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Build where condition
  const whereCondition: {
    reddit_community_moderator_id: string & tags.Format<"uuid">;
    ip?: Prisma.StringFilter | undefined;
  } = {
    reddit_community_moderator_id: props.redditCommunityModeratorId,
  };

  if (props.body.search) {
    whereCondition.ip = { contains: props.body.search };
  }

  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Order
  const orderByField = props.body.orderBy ?? "created_at";
  const orderDirection = props.body.orderDirection ?? "desc";

  // Concurrently fetch data and total count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderator_sessions.findMany({
      where: whereCondition,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_moderator_sessions.count({
      where: whereCondition,
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
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
