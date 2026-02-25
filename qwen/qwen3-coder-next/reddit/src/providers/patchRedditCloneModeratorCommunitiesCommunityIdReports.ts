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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorCommunitiesCommunityIdReports(props: {
  moderator: ModeratorPayload;
  communityId: string;
  body: IRedditCloneContentReport.IRequest;
}): Promise<IPageIRedditCloneContentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  // Validate page and limit bounds
  const validatedPage = Math.max(1, page);
  const validatedLimit = Math.min(Math.max(1, limit), 100);
  // Query reports for the specified community
  // Join with content tables to get content preview and reporter info
  const data = await MyGlobal.prisma.reddit_clone_content_reports.findMany({
    where: {
      OR: [
        { post: { community_id: props.communityId } },
        { comment: { post: { community_id: props.communityId } } },
      ],
      deleted_at: null,
      ...(props.body.status && { status: props.body.status }),
    },
    skip: (validatedPage - 1) * validatedLimit,
    take: validatedLimit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reporter_id: true,
      post_id: true,
      comment_id: true,
      report_type: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
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
      reporter: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_content_reports.count({
    where: {
      OR: [
        { post: { community_id: props.communityId } },
        { comment: { post: { community_id: props.communityId } } },
      ],
      deleted_at: null,
      ...(props.body.status && { status: props.body.status }),
    },
  });
  return {
    data: data.map((report) => {
      // Build content summary based on report type
      const content =
        report.report_type === "post" && report.post
          ? {
              type: "post" as const,
              id: report.post.id,
              title: report.post.title,
              content: report.post.content
                ? report.post.content.substring(0, 200)
                : "",
              created_at: toISOStringSafe(report.post.created_at),
            }
          : report.report_type === "comment" && report.comment
            ? {
                type: "comment" as const,
                id: report.comment.id,
                title: report.comment.content
                  ? report.comment.content.substring(0, 200)
                  : "",
                content: report.comment.content
                  ? report.comment.content.substring(0, 200)
                  : "",
                created_at: toISOStringSafe(report.comment.created_at),
              }
            : {
                type:
                  report.report_type === "post"
                    ? "post"
                    : report.report_type === "comment"
                      ? "comment"
                      : report.report_type,
                id: report.post_id ?? report.comment_id ?? "",
                title: "",
                content: "",
                created_at: "",
              };
      return {
        id: report.id,
        reporter: {
          id: report.reporter.id,
          username: report.reporter.username,
          displayName: report.reporter.display_name ?? "",
          avatarUrl: report.reporter.avatar_url ?? "",
        } satisfies IRedditCloneMember.ISummary,
        content,
        reason: report.reason,
        status:
          report.status === "pending" ||
          report.status === "approved" ||
          report.status === "dismissed"
            ? report.status
            : "pending",
        created_at: toISOStringSafe(report.created_at),
      } satisfies IRedditCloneContentReport.ISummary;
    }),
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCloneContentReport.ISummary;
}
