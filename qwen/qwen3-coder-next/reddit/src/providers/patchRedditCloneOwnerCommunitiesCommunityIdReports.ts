import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentReport";
import { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneOwnerCommunitiesCommunityIdReports(props: {
  owner: OwnerPayload;
  communityId: string;
  body: IRedditCloneContentReport.IRequest;
}): Promise<IPageIRedditCloneContentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause with community filter and optional status filter
  const where: Prisma.reddit_clone_content_reportsWhereInput = {
    post: {
      community_id: props.communityId,
    },
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
  };
  // Get reports with related data
  const data = await MyGlobal.prisma.reddit_clone_content_reports.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      reporter: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          content: true,
          created_at: true,
        },
      },
      comment: {
        select: {
          id: true,
          content: true,
          created_at: true,
        },
      },
    },
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_content_reports.count({
    where,
  });
  // Transform data to ISummary format
  const transformedData: IRedditCloneContentReport.ISummary[] = data.map(
    (report) => {
      // Determine content type and title based on report_type
      const content: IRedditCloneContentReport.IContent = {
        type: report.report_type,
        id:
          report.report_type === "post" && report.post
            ? report.post.id
            : report.comment
              ? report.comment.id
              : "",
        title:
          report.report_type === "post" && report.post
            ? report.post.title
            : report.comment
              ? report.comment.content.substring(0, 200)
              : "",
        content:
          report.report_type === "post" && report.post
            ? (report.post.content ?? "")
            : report.comment
              ? report.comment.content.substring(0, 200)
              : "",
        created_at:
          (report.report_type === "post" && report.post
            ? toISOStringSafe(report.post.created_at)
            : report.comment
              ? toISOStringSafe(report.comment.created_at)
              : null) ?? "",
      };
      const status = report.status as "pending" | "approved" | "dismissed";
      return {
        id: report.id,
        reporter: {
          id: report.reporter.id,
          username: report.reporter.username,
          displayName: report.reporter.display_name ?? null,
          avatarUrl: report.reporter.avatar_url ?? null,
        },
        content,
        reason: report.reason,
        status: status,
        created_at: toISOStringSafe(report.created_at) ?? "",
      };
    },
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
