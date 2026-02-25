import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditReportResolution";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { IRedditReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditReportResolutionAtSummaryTransformer } from "../transformers/RedditReportResolutionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditMemberReportsReportIdResolutions(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditReportResolution.IRequest;
}): Promise<IPageIRedditReportResolution.ISummary> {
  const report = await MyGlobal.prisma.reddit_reports.findUnique({
    where: { id: props.reportId },
    select: { reddit_member_id: true },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }
  if (report.reddit_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereQuery = {
    report_id: props.reportId,
    ...(props.body.resolutionType && {
      resolution_type: props.body.resolutionType,
    }),
    ...(props.body.resolutionTimestampStart && {
      created_at: { gte: props.body.resolutionTimestampStart },
      ...(props.body.resolutionTimestampEnd && {
        created_at: { lte: props.body.resolutionTimestampEnd },
      }),
    }),
  };
  const resolutions = await MyGlobal.prisma.reddit_report_resolutions.findMany({
    where: whereQuery,
    skip,
    take: limit,
    select: {
      id: true,
      resolution_type: true,
      dismissal_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      report: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          reddit_member_id: true,
          reason: true,
          status: true,
          reporter: {
            select: {
              profile: {
                select: {
                  display_name: true,
                },
              },
            },
          },
          moderationLogs: true,
          resolutions: true,
        },
      },
      moderator: {
        select: {
          id: true,
          email: true,
          password_hash: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          sessions: true,
          passwordResets: true,
          emailVerifications: true,
          profile: true,
          communities: true,
          subscriptions: true,
          posts: true,
          postVotes: true,
          commentVotes: true,
          reports: true,
          resolutions: true,
          feedPreferences: true,
          viewStats: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_report_resolutions.count({
    where: whereQuery,
  });
  const transformedResolutions = await ArrayUtil.asyncMap(resolutions, (r) =>
    RedditReportResolutionAtSummaryTransformer.transform(r),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedResolutions,
  };
}
