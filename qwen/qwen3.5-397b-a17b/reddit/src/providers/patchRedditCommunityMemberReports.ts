import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityReportAtSummaryTransformer } from "../transformers/RedditCommunityReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberReports(props: {
  member: MemberPayload;
  body: IRedditCommunityReport.IRequest;
}): Promise<IPageIRedditCommunityReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.report_type !== undefined && {
      report_type: props.body.report_type,
    }),
    ...(props.body.reporter_id !== undefined && {
      reporter_id: props.body.reporter_id,
    }),
    ...(props.body.resolved !== undefined && {
      resolved_at: props.body.resolved ? { not: null } : null,
    }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: props.body.created_before },
    }),
    ...(props.body.resolved_after !== undefined && {
      resolved_at: { gte: props.body.resolved_after },
    }),
    ...(props.body.resolved_before !== undefined && {
      resolved_at: { lte: props.body.resolved_before },
    }),
  } satisfies Prisma.reddit_community_reportsWhereInput;
  const orderByInput: Prisma.reddit_community_reportsOrderByWithRelationInput =
    {
      [props.body.sort ?? "created_at"]: props.body.order ?? "desc",
    } satisfies Prisma.reddit_community_reportsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_reports.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityReportAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityReport.ISummary;
}
