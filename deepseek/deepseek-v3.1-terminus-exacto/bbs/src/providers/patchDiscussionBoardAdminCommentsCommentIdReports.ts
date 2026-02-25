import { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentReportAtSummaryTransformer } from "../transformers/DiscussionBoardCommentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminCommentsCommentIdReports(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentReport.IRequest;
}): Promise<IPageIDiscussionBoardCommentReport.ISummary> {
  // Validate target comment exists
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Build filter conditions
  const whereConditions = {
    reported_comment_id: props.commentId,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.created_date_start && {
      created_at: {
        gte: new Date(props.body.created_date_start),
        ...(props.body.created_date_end && {
          lte: new Date(props.body.created_date_end),
        }),
      },
    }),
    ...(props.body.resolved_date_start && {
      resolved_at: {
        gte: new Date(props.body.resolved_date_start),
        ...(props.body.resolved_date_end && {
          lte: new Date(props.body.resolved_date_end),
        }),
      },
    }),
  } satisfies Prisma.discussion_board_comment_reportsWhereInput;
  // Calculate pagination
  const currentPage = Math.max(1, props.body.page ?? 1);
  const pageLimit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const recordsToSkip = Math.max(0, (currentPage - 1) * pageLimit);
  // Execute parallel queries
  const [reportData, totalRecords] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_reports.findMany({
      where: whereConditions,
      skip: recordsToSkip,
      take: pageLimit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardCommentReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_comment_reports.count({
      where: whereConditions,
    }),
  ]);
  // Transform results
  const transformedReports = await ArrayUtil.asyncMap(
    reportData,
    DiscussionBoardCommentReportAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: currentPage,
      limit: pageLimit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / pageLimit),
    } satisfies IPage.IPagination,
    data: transformedReports,
  };
}
