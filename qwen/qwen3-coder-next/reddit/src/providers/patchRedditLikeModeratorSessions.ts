import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberSession";
import { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeMemberSessionAtSummaryTransformer } from "../transformers/RedditLikeMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorSessions(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeGuestSession.IRequest;
}): Promise<IPageIRedditLikeMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.reddit_like_member_sessionsWhereInput = {
    revoked_at: null,
  };
  if (props.body.status === "active") {
    whereCondition.AND = [
      {
        OR: [
          { expired_at: null },
          { expired_at: { gte: toISOStringSafe(new Date()) } },
        ],
      },
    ];
  } else if (props.body.status === "expired") {
    whereCondition.OR = [
      { expired_at: { lt: toISOStringSafe(new Date()) } },
      { revoked_at: { not: null } },
    ];
  } else if (props.body.status === "revoked") {
    whereCondition.revoked_at = {
      not: null,
    };
  }
  const data = await MyGlobal.prisma.reddit_like_member_sessions.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditLikeMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_member_sessions.count({
    where: whereCondition,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
