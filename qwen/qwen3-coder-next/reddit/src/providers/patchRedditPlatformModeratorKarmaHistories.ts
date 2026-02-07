import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformKarmaHistory";
import { IRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformModeratorKarmaHistories(props: {
  moderator: ModeratorPayload;
  body: IRedditPlatformKarmaHistory.IRequest;
}): Promise<IPageIRedditPlatformKarmaHistory.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = 0;
  // Build where clause with optional filters
  const whereInput: Prisma.reddit_platform_karma_historiesWhereInput = {
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.reddit_platform_karma_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc" as const,
    },
  });
  const total = await MyGlobal.prisma.reddit_platform_karma_histories.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      karma_score: record.balance_after,
      created_at: toISOStringSafe(record.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
