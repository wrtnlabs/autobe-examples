import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportReason";
import { IPageIRedditCommunityReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportReason";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityRedditCommunityReportReasons(props: {
  body: IRedditCommunityReportReason.IRequest;
}): Promise<IPageIRedditCommunityReportReason.ISummary> {
  const { page = 0, limit = 10, search } = props.body;

  if (page < 0) throw new HttpException("Page must be non-negative", 400);
  if (limit <= 0) throw new HttpException("Limit must be positive", 400);

  const whereConditions = search
    ? {
        OR: [
          { reason_code: { contains: search } },
          { reason_name: { contains: search } },
        ],
      }
    : undefined;

  const skip = page * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_report_reasons.findMany({
      where: whereConditions,
      orderBy: { reason_code: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_report_reasons.count({
      where: whereConditions,
    }),
  ]);

  const data = results.map((reason) => ({
    id: reason.id,
    reason_code: reason.reason_code,
    reason_name: reason.reason_name,
    description: reason.description ?? null,
  }));

  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
