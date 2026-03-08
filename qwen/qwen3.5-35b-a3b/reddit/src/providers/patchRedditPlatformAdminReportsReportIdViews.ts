import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReportView";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IRedditPlatformReportView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReportView";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminReportsReportIdViews(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditPlatformReportView.IRequest;
}): Promise<IPageIRedditPlatformReportView.ISummary> {
  const report = await MyGlobal.prisma.reddit_platform_reports.findFirst({
    where: {
      id: props.reportId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_id: true,
      reporter: { select: { username: true } },
      community: { select: { name: true } },
    },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: report.community_id,
        user_id: props.admin.id,
      },
    });
  const owner = await MyGlobal.prisma.reddit_platform_communities.findFirst({
    where: { id: report.community_id, owner_id: props.admin.id },
  });
  if (isModerator === null && owner === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_report_viewsWhereInput = {
    report_id: props.reportId,
    ...(props.body.moderator_id !== undefined && {
      moderator_id: props.body.moderator_id,
    }),
  } satisfies Prisma.reddit_platform_report_viewsWhereInput;
  const orderByInput = (
    props.body.sort?.field !== undefined
      ? {
          [props.body.sort.field]:
            props.body.sort.order === "asc" ? "asc" : "desc",
        }
      : { viewed_at: "desc" }
  ) satisfies Prisma.reddit_platform_report_viewsOrderByWithRelationInput;
  const [views, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_report_views.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        viewed_at: true,
        created_at: true,
        updated_at: true,
        moderator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            email: true,
            is_active: true,
            created_at: true,
          },
        },
        report: {
          select: {
            id: true,
            reporter: { select: { username: true } },
            community: { select: { name: true } },
            reported_content_type: true,
            reported_content_id: true,
            reason: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            snapshots: true,
            viewHistories: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_platform_report_views.count({
      where: whereInput,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(views, async (view) => {
    const reporter = view.report.reporter;
    const community = view.report.community;
    return {
      id: view.id,
      moderator: {
        id: view.moderator.id,
        username: view.moderator.username,
        display_name: view.moderator.display_name,
        email: view.moderator.email,
        is_active: view.moderator.is_active,
        created_at: toISOStringSafe(view.moderator.created_at),
      } satisfies IRedditPlatformAdmin.ISummary,
      report: {
        id: view.report.id,
        reporter_username: reporter.username,
        community_name: community.name,
        reported_content_type: view.report.reported_content_type,
        reported_content_id: view.report.reported_content_id,
        reason: view.report.reason,
        status: view.report.status,
        created_at: toISOStringSafe(view.report.created_at),
      } satisfies IRedditPlatformReport.ISummary,
      viewed_at: toISOStringSafe(view.viewed_at),
      created_at: toISOStringSafe(view.created_at),
      updated_at: toISOStringSafe(view.updated_at),
    };
  });
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformReportView.ISummary;
}
