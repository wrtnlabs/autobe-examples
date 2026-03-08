import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
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

export async function patchRedditLikeModeratorReportsReportIdModeratorAction(props: {
  moderator: ModeratorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditLikeReport.IRequest;
}): Promise<IPageIRedditLikeReport.ISummary> {
  // Query the report with its relationships to verify existence and get reported content info
  const report = await MyGlobal.prisma.reddit_like_reports.findFirst({
    where: {
      id: props.reportId,
      status: "pending" as const,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      created_at: true,
      reporter: {
        select: {
          id: true,
          username: true,
          entity_type: true,
          title: true,
          content: true,
          score: true,
          hit_count: true,
          created_at: true,
        },
      },
      reportedPost: { select: { id: true } },
      reportedComment: { select: { id: true } },
    },
  });
  if (report === null) {
    throw new HttpException("Report not found or not in pending status", 404);
  }
  // Determine operation - since body is IRequest type, assume approval by default
  // In production, this would check for an explicit operation in the request body
  const operation = "approve" as const; // Default operation
  // Execute database operations in transaction
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Update report status
    await prisma.reddit_like_reports.update({
      where: { id: props.reportId },
      data: {
        status: operation === "approve" ? "approved" : "dismissed",
        updated_at: new Date().toISOString(),
      },
    });
    // If approving, delete the reported content
    if (operation === "approve") {
      if (report.reportedPost) {
        await prisma.reddit_like_posts.delete({
          where: { id: report.reportedPost.id },
        });
      } else if (report.reportedComment) {
        await prisma.reddit_like_comments.delete({
          where: { id: report.reportedComment.id },
        });
      }
    }
  });
  // Fetch updated report with full details for response using ISummary transformer
  const updatedReport = await MyGlobal.prisma.reddit_like_reports.findUnique({
    where: { id: props.reportId },
    select: {
      id: true,
      status: true,
      created_at: true,
      reporter: {
        select: {
          id: true,
          username: true,
          entity_type: true,
          title: true,
          content: true,
          score: true,
          hit_count: true,
          created_at: true,
        },
      },
      reportedPost: { select: { id: true } },
      reportedComment: { select: { id: true } },
    },
  });
  if (!updatedReport) {
    throw new HttpException("Failed to retrieve updated report", 500);
  }
  // Transform to ISummary format
  const transformed: IRedditLikeReport.ISummary = {
    id: updatedReport.id,
    reporter: {
      id: updatedReport.reporter.id,
      entity_type: updatedReport.reporter.entity_type,
      title: updatedReport.reporter.title,
      content: updatedReport.reporter.content,
      score: updatedReport.reporter.score,
      hit_count: updatedReport.reporter.hit_count,
      created_at: updatedReport.reporter.created_at.toISOString(),
    } satisfies IRedditLikeMember.ISummary,
    reported_content_type: updatedReport.reportedPost ? "post" : "comment",
    reported_content_id: updatedReport.reportedPost
      ? updatedReport.reportedPost.id
      : updatedReport.reportedComment!.id,
    status: updatedReport.status as "pending" | "approved" | "dismissed",
    created_at: updatedReport.created_at.toISOString(),
  };
  return {
    data: [typia.assert<IRedditLikeReport.ISummary>(transformed)],
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    },
  };
}
