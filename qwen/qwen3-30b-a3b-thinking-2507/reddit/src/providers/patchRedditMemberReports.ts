import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditReport";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditReportAtSummaryTransformer } from "../transformers/RedditReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditMemberReports(props: {
  member: MemberPayload;
  body: IRedditReport.IRequest;
}): Promise<IPageIRedditReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.communityId && { community_id: props.body.communityId }),
    ...(props.body.status && {
      status: props.body.status as "pending" | "approved" | "dismissed",
    }),
    ...(props.body.reporterId && { reporter_id: props.body.reporterId }),
    ...(props.body.minCreatedAt && {
      created_at: { gte: new Date(props.body.minCreatedAt) },
    }),
    ...(props.body.maxCreatedAt && {
      created_at: { lte: new Date(props.body.maxCreatedAt) },
    }),
  };
  const data = await MyGlobal.prisma.reddit_reports.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reason: true,
      status: true,
      created_at: true,
      resolutions: true,
      moderationLogs: true,
      reporter: {
        select: {
          profile: {
            select: { display_name: true },
          },
        },
      },
    },
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditReportAtSummaryTransformer.transform,
  );
  const total = await MyGlobal.prisma.reddit_reports.count({ where });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditReport.ISummary;
}
