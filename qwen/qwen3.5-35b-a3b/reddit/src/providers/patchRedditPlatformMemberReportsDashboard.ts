import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformReportAtSummaryTransformer } from "../transformers/RedditPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberReportsDashboard(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.IRequest;
}): Promise<IPageIRedditPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const validatedLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * validatedLimit;
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        user_id: props.member.id,
      },
      select: { community_id: true },
    });
  if (moderatorCommunities.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: validatedLimit,
        records: 0,
        pages: 0,
      },
    };
  }
  const communityIds = moderatorCommunities.map((m) => m.community_id);
  const whereInput = {
    status: "pending",
    community_id: { in: communityIds },
    deleted_at: null,
  } satisfies Prisma.reddit_platform_reportsWhereInput;
  const reports = await MyGlobal.prisma.reddit_platform_reports.findMany({
    where: whereInput,
    skip,
    take: validatedLimit,
    orderBy: { created_at: "desc" },
    ...RedditPlatformReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_reports.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    reports,
    RedditPlatformReportAtSummaryTransformer.transform,
  );
  const now = new Date();
  const nowISO = now.toISOString();
  await Promise.all(
    reports.map((report) =>
      MyGlobal.prisma.reddit_platform_report_views.create({
        data: {
          id: v4(),
          moderator_id: props.member.id,
          report_id: report.id,
          viewed_at: nowISO,
          created_at: nowISO,
          updated_at: nowISO,
        },
      }),
    ),
  );
  return {
    data,
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    },
  };
}
