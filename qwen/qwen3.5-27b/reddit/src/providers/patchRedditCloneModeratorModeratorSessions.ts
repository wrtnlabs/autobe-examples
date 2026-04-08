import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorSession";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneModeratorSessionAtSummaryTransformer } from "../transformers/RedditCloneModeratorSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorModeratorSessions(props: {
  moderator: ModeratorPayload;
  body: IRedditCloneModeratorSession.IRequest;
}): Promise<IPageIRedditCloneModeratorSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_clone_moderator_id: props.moderator.id,
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: new Date(props.body.createdAtFrom),
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: new Date(props.body.createdAtTo),
      },
    }),
    ...(props.body.ip && {
      ip: {
        contains: props.body.ip,
      },
    }),
    ...(props.body.isExpired !== undefined && {
      expired_at: props.body.isExpired
        ? { lte: new Date() }
        : { gt: new Date() },
    }),
    ...(props.body.href && {
      href: {
        contains: props.body.href,
      },
    }),
    ...(props.body.referrer !== undefined && {
      referrer:
        props.body.referrer === null ? null : { contains: props.body.referrer },
    }),
  } satisfies Prisma.reddit_clone_moderator_sessionsWhereInput;
  const records =
    await MyGlobal.prisma.reddit_clone_moderator_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditCloneModeratorSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_clone_moderator_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneModeratorSessionAtSummaryTransformer.transform,
    ),
  };
}
