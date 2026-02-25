import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationAppeal";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneModerationAppealAtSummaryTransformer } from "../transformers/RedditCloneModerationAppealAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorAppealsQueue(props: {
  moderator: ModeratorPayload;
}): Promise<IPageIRedditCloneModerationAppeal.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_clone_moderation_appeals.findMany({
    where: {
      status: "pending",
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...RedditCloneModerationAppealAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_moderation_appeals.count({
    where: {
      status: "pending",
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneModerationAppealAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
