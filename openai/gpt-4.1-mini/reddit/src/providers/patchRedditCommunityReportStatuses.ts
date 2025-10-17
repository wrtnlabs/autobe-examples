import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";
import { IPageIRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportStatus";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityReportStatuses(props: {
  body: IRedditCommunityReportStatus.IRequest;
}): Promise<IPageIRedditCommunityReportStatus.ISummary> {
  const { body } = props;

  const page =
    body.page !== undefined && body.page !== null ? Number(body.page) : 0;
  const limit =
    body.limit !== undefined && body.limit !== null ? Number(body.limit) : 10;
  const skip = page * limit;

  const where = {
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_report_statuses.findMany({
      where,
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_report_statuses.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      name: item.name,
    })),
  };
}
