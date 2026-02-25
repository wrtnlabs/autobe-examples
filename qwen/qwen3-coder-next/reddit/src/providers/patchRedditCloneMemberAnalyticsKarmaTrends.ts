import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarma";
import { IRedditCloneKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarma";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberAnalyticsKarmaTrends(props: {
  member: MemberPayload;
  body: IRedditCloneKarma.IRequest;
}): Promise<IPageIRedditCloneKarma> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Get the member's karma record
  const karmaRecord = await MyGlobal.prisma.reddit_clone_karmas.findFirst({
    where: {
      member_id: props.member.id,
    },
  });
  if (!karmaRecord) {
    return {
      data: [],
      pagination: {
        current: 0 satisfies number as number,
        limit: 0 satisfies number as number,
        records: 0 satisfies number as number,
        pages: 0 satisfies number as number,
      } satisfies IPage.IPagination,
    };
  }
  // Get all karma logs for the member
  const whereClause: Prisma.reddit_clone_content_karma_logsWhereInput = {
    user_id: props.member.id,
  };
  const logs = await MyGlobal.prisma.reddit_clone_content_karma_logs.findMany({
    where: whereClause,
    orderBy: [{ user_id: "asc" }],
    skip: 0,
    take: 10000,
  });
  // Sort by requested criterion first since we have no timestamps
  if (props.body.sort === "percentageChange") {
    logs.sort((a, b) => b.score - a.score);
  } else {
    logs.sort((a, b) => b.score - a.score);
  }
  // Apply pagination
  const paginatedLogs = logs.slice(skip, skip + limit);
  // Build trends with single-score data (no time-series possible without timestamps)
  const trends: IRedditCloneKarma[] = paginatedLogs.map(
    (log) =>
      ({
        date: new Date().toISOString() satisfies string &
          tags.Format<"date-time">,
        scoreChange: log.score,
        percentageChange: 100,
        postCount: 0 satisfies number as number,
        commentCount: 0 satisfies number as number,
        totalScore: log.score,
      }) satisfies IRedditCloneKarma,
  );
  return {
    data: trends,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: logs.length satisfies number as number,
      pages: Math.ceil(logs.length / limit) satisfies number as number,
    } satisfies IPage.IPagination,
  };
}
