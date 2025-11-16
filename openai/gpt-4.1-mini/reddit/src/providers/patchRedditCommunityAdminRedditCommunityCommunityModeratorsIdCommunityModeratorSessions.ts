import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorSession";
import { IPageIRedditCommunityCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityModeratorSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityCommunityModeratorsIdCommunityModeratorSessions(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModeratorSession.IRequest;
}): Promise<IPageIRedditCommunityCommunityModeratorSession.ISummary> {
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const whereConditions = {
    reddit_community_community_moderator_id: props.id,
    ip: props.body.filter?.ip ?? undefined,
    ip6: props.body.filter?.ip6 ?? undefined,
  };

  const orderBy = props.body.sortBy
    ? {
        [props.body.sortBy]: (props.body.order === "asc"
          ? "asc"
          : "desc") satisfies "asc" | "desc" as "asc" | "desc",
      }
    : { created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc" };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_moderator_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        reddit_community_community_moderator_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_community_moderator_sessions.count({
      where: whereConditions,
    }),
  ]);

  return {
    data: sessions.map((session) => ({
      id: session.id,
      reddit_community_community_moderator_id:
        session.reddit_community_community_moderator_id,
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
      pages: Math.ceil(total / limit) satisfies number as number,
    },
  };
}
