import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfMemberUser";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserReportsReportIdReporterMemberUser(props: {
  adminUser: AdminuserPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReportOfMemberUser.IInvert> {
  // The adminUser payload is already authorized by guards/decorators.
  // This function trusts that context and focuses on data retrieval and mapping.

  // 1. Look up the member reporter link row for the given reportId
  const link =
    await MyGlobal.prisma.discussion_board_report_of_memberusers.findFirst({
      where: {
        discussion_board_report_id: props.reportId,
      },
    });

  if (link === null) {
    // Either the report does not exist or it has no member user reporter link
    throw new HttpException(
      "Report not found or has no member user reporter",
      404,
    );
  }

  // 2. Load the underlying report entity
  const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: {
      id: link.discussion_board_report_id,
    },
  });

  if (report === null) {
    throw new HttpException("Report not found", 404);
  }

  // 3. Load the reporting member user entity
  const memberUser =
    await MyGlobal.prisma.discussion_board_memberusers.findUnique({
      where: {
        id: link.discussion_board_memberuser_id,
      },
    });

  // If the member user is missing or soft-deleted, treat as not found for this context
  if (memberUser === null || memberUser.deleted_at !== null) {
    throw new HttpException("Reporting member user not found", 404);
  }

  // 4. Map database entities to DTO structure
  const invert: IDiscussionBoardReportOfMemberUser.IInvert = {
    id: link.id,
    discussion_board_report_id: link.discussion_board_report_id,
    discussion_board_memberuser_id: link.discussion_board_memberuser_id,
    created_at: toISOStringSafe(link.created_at),
    report: {
      id: report.id,
      target_type: report.target_type,
      reporter_type: report.reporter_type,
      reason_code: report.reason_code,
      status: report.status,
      action: report.action,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    },
    memberUser: {
      id: memberUser.id,
      display_name: memberUser.display_name,
      account_status: memberUser.account_status,
      created_at: toISOStringSafe(memberUser.created_at),
    },
  };

  return invert;
}
