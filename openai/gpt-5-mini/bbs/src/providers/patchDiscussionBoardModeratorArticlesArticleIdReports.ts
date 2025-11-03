import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorArticlesArticleIdReports(props: {
  moderator: ModeratorPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.IRequest;
}): Promise<IPageIDiscussionBoardReport.ISummary> {
  const { moderator, articleId, body } = props;

  // Verify article exists
  try {
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: articleId },
    });
  } catch (err) {
    throw new HttpException("Not Found", 404);
  }

  const page = Number(body.page ?? 1);
  const limit = Math.min(Number(body.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  // Record moderator access for audit purposes
  try {
    const occurred_at = toISOStringSafe(new Date());
    await MyGlobal.prisma.discussion_board_moderation_audit.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        moderation_action_id: null,
        report_id: null,
        actor_moderator_id: moderator.id,
        event_type: "report.search",
        event_payload: JSON.stringify({ articleId, filters: body }),
        occurred_at: occurred_at,
      },
    });
  } catch (err) {
    // Audit failure should not block the main operation; log if available
    // Continue execution
  }

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_reports.findMany({
        where: {
          target_type: "article",
          target_id: articleId,
          ...(body.status !== undefined && { status: body.status }),
          ...(body.reasonCategory !== undefined &&
            body.reasonCategory !== null && {
              reason_category: body.reasonCategory,
            }),
          ...(body.reporterMemberId !== undefined &&
            body.reporterMemberId !== null && {
              reporter_member_id: body.reporterMemberId,
            }),
          ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
          (body.createdTo !== undefined && body.createdTo !== null)
            ? {
                created_at: {
                  ...(body.createdFrom !== undefined &&
                    body.createdFrom !== null && { gte: body.createdFrom }),
                  ...(body.createdTo !== undefined &&
                    body.createdTo !== null && { lte: body.createdTo }),
                },
              }
            : {}),
          ...((body.processedFrom !== undefined &&
            body.processedFrom !== null) ||
          (body.processedTo !== undefined && body.processedTo !== null)
            ? {
                processed_at: {
                  ...(body.processedFrom !== undefined &&
                    body.processedFrom !== null && { gte: body.processedFrom }),
                  ...(body.processedTo !== undefined &&
                    body.processedTo !== null && { lte: body.processedTo }),
                },
              }
            : {}),
          ...(body.search !== undefined &&
            body.search !== null && { explanation: { contains: body.search } }),
          ...(body.includeProcessed !== true && { processed_at: null }),
          ...(body.includeClosed !== true && { closed_at: null }),
        },
        orderBy:
          body.sortBy === "createdAt"
            ? { created_at: "asc" }
            : body.sortBy === "-createdAt"
              ? { created_at: "desc" }
              : body.sortBy === "processedAt"
                ? { processed_at: "asc" }
                : body.sortBy === "-processedAt"
                  ? { processed_at: "desc" }
                  : { created_at: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          reporter_member_id: true,
          reason_category: true,
          target_id: true,
          status: true,
          created_at: true,
          processed_at: true,
          closed_at: true,
          explanation: true,
          ...(body.includeReporterContext
            ? {
                reporterMember: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    created_at: true,
                  },
                },
              }
            : {}),
        },
      }),

      MyGlobal.prisma.discussion_board_reports.count({
        where: {
          target_type: "article",
          target_id: articleId,
          ...(body.status !== undefined && { status: body.status }),
          ...(body.reasonCategory !== undefined &&
            body.reasonCategory !== null && {
              reason_category: body.reasonCategory,
            }),
          ...(body.reporterMemberId !== undefined &&
            body.reporterMemberId !== null && {
              reporter_member_id: body.reporterMemberId,
            }),
          ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
          (body.createdTo !== undefined && body.createdTo !== null)
            ? {
                created_at: {
                  ...(body.createdFrom !== undefined &&
                    body.createdFrom !== null && { gte: body.createdFrom }),
                  ...(body.createdTo !== undefined &&
                    body.createdTo !== null && { lte: body.createdTo }),
                },
              }
            : {}),
          ...((body.processedFrom !== undefined &&
            body.processedFrom !== null) ||
          (body.processedTo !== undefined && body.processedTo !== null)
            ? {
                processed_at: {
                  ...(body.processedFrom !== undefined &&
                    body.processedFrom !== null && { gte: body.processedFrom }),
                  ...(body.processedTo !== undefined &&
                    body.processedTo !== null && { lte: body.processedTo }),
                },
              }
            : {}),
          ...(body.search !== undefined &&
            body.search !== null && { explanation: { contains: body.search } }),
          ...(body.includeProcessed !== true && { processed_at: null }),
          ...(body.includeClosed !== true && { closed_at: null }),
        },
      }),
    ]);

    const data = rows.map((r) => {
      const excerpt = r.explanation
        ? r.explanation.length > 500
          ? r.explanation.slice(0, 500)
          : r.explanation
        : null;

      return {
        id: r.id as string & tags.Format<"uuid">,
        reporterMemberId:
          r.reporter_member_id === null
            ? null
            : (r.reporter_member_id as string & tags.Format<"uuid">),
        reporter:
          body.includeReporterContext && r.reporterMember
            ? {
                id: r.reporterMember.id as string & tags.Format<"uuid">,
                username: r.reporterMember.username,
                display_name: r.reporterMember.display_name ?? null,
                created_at: toISOStringSafe(r.reporterMember.created_at),
              }
            : undefined,
        reasonCategory:
          r.reason_category as IDiscussionBoardReportReasonCategory,
        targetType: "article",
        targetId: r.target_id as string & tags.Format<"uuid">,
        status: r.status as IDiscussionBoardReportStatus,
        createdAt: toISOStringSafe(r.created_at),
        processedAt: r.processed_at ? toISOStringSafe(r.processed_at) : null,
        closedAt: r.closed_at ? toISOStringSafe(r.closed_at) : null,
        explanationExcerpt: excerpt,
      };
    });

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch (error) {
    throw new HttpException("Internal Server Error", 500);
  }
}
