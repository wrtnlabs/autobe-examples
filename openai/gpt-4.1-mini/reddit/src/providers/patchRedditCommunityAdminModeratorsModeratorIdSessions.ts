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
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminModeratorsModeratorIdSessions(props: {
  admin: AdminPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCommunityModeratorSession.IRequest;
}): Promise<IPageIRedditCommunityModeratorSession.ISummary> {
  const { admin, moderatorId, body } = props;

  const moderator = await MyGlobal.prisma.reddit_community_moderator.findUnique(
    {
      where: { id: moderatorId },
      select: { id: true },
    },
  );

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const cappedLimit = limit > 100 ? 100 : limit;

  const where = {
    reddit_community_moderator_id: moderatorId,
  } as const;

  if (body.filter_active === true) {
    Object.assign(where, { expired_at: null });
  } else if (body.filter_expired === true) {
    Object.assign(where, { expired_at: { not: null } });
  }

  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };

  if (body.sort_by === "created_at" || body.sort_by === "expired_at") {
    orderBy = { [body.sort_by]: body.order === "asc" ? "asc" : "desc" };
  }

  const skip = (page - 1) * cappedLimit;

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderator_sessions.findMany({
      where,
      orderBy: orderBy as any,
      skip,
      take: cappedLimit,
      include: {
        redditCommunityModerator: {
          select: {
            id: true,
            user_id: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_moderator_sessions.count({ where }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id,
    reddit_community_moderator_id: session.reddit_community_moderator_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    moderator: {
      id: session.redditCommunityModerator.id,
      user_id: session.redditCommunityModerator.user_id,
      created_at: toISOStringSafe(session.redditCommunityModerator.created_at),
      user_email: "", // assign empty string instead of null to match ISummary
      user_created_at: "",
    },
  }));

  return {
    pagination: {
      current: page,
      limit: cappedLimit,
      records: total,
      pages: Math.ceil(total / cappedLimit),
    },
    data,
  };
}
