import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportedContent";
import { IPageIDiscussionBoardReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReportedContent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorReportedContent(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardReportedContent.IRequest;
}): Promise<IPageIDiscussionBoardReportedContent.ISummary> {
  try {
    const searchCriteria = typia.assert<Record<string, any>>(
      JSON.parse(props.body),
    );
    const whereCondition = {
      ...(searchCriteria.report_status && {
        report_status: searchCriteria.report_status,
      }),
      ...(searchCriteria.content_type && {
        content_type: searchCriteria.content_type,
      }),
    };

    const page = searchCriteria.page ?? 1;
    const limit = searchCriteria.limit ?? 100;
    const skip = (page - 1) * limit;

    const [reportedContent, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_reported_content.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      MyGlobal.prisma.discussion_board_reported_content.count({
        where: whereCondition,
      }),
    ]);

    const result: IPageIDiscussionBoardReportedContent.ISummary = {
      data: reportedContent.map((report) =>
        typia.assert<IDiscussionBoardReportedContent.ISummary>({
          id: report.id,
          report_reason: report.report_reason,
          created_at: toISOStringSafe(report.created_at),
        }),
      ),
      pagination: {
        current: page,
        limit,
        records: total,
        pages:
          total !== null && total !== undefined ? Math.ceil(total / limit) : 0,
      },
    };

    return typia.assert<IPageIDiscussionBoardReportedContent.ISummary>(result);
  } catch (error) {
    throw new HttpException("Failed to retrieve reported content", 500);
  }
}
