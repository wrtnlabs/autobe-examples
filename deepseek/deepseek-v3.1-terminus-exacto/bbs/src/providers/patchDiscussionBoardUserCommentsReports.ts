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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentReportAtSummaryTransformer } from "../transformers/DiscussionBoardCommentReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserCommentsReports(props: {
  user: UserPayload;
  body: IDiscussionBoardCommentReport.IRequest;
}): Promise<IPageIDiscussionBoardCommentReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.discussion_board_comment_reportsWhereInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.reporter_user_id && {
      reporter_user_id: props.body.reporter_user_id,
    }),
    ...(props.body.reported_comment_id && {
      reported_comment_id: props.body.reported_comment_id,
    }),
  };
  // Apply sorting
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "created_at_desc"
        ? { created_at: "desc" as const }
        : props.body.sort === "resolved_at_asc"
          ? { resolved_at: "asc" as const }
          : props.body.sort === "resolved_at_desc"
            ? { resolved_at: "desc" as const }
            : { created_at: "desc" as const }
  ) satisfies Prisma.discussion_board_comment_reportsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_reports.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardCommentReportAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_comment_reports.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentReportAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
