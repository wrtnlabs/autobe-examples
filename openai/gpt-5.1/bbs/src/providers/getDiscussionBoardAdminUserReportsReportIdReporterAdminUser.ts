import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportOfAdminusers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfAdminusers";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserReportsReportIdReporterAdminUser(props: {
  adminUser: AdminuserPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReportOfAdminusers> {
  const link =
    await MyGlobal.prisma.discussion_board_report_of_adminusers.findFirst({
      where: {
        discussion_board_report_id: props.reportId,
      },
    });

  if (link === null) {
    throw new HttpException(
      "Admin reporter association not found for the given reportId",
      404,
    );
  }

  const report = await MyGlobal.prisma.discussion_board_reports.findFirst({
    where: {
      id: link.discussion_board_report_id,
    },
  });

  if (report === null) {
    throw new HttpException("Report not found for the given association", 404);
  }

  const admin = await MyGlobal.prisma.discussion_board_adminusers.findFirst({
    where: {
      id: link.discussion_board_adminuser_id,
    },
  });

  if (admin === null) {
    throw new HttpException(
      "Admin user not found for the given association",
      404,
    );
  }

  const dto: IDiscussionBoardReportOfAdminusers = {
    id: link.id,
    discussion_board_report_id: link.discussion_board_report_id,
    discussion_board_adminuser_id: link.discussion_board_adminuser_id,
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
    adminUser: {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name,
      email_verified: admin.email_verified,
      account_status: admin.account_status,
      created_at: toISOStringSafe(admin.created_at),
      last_login_at:
        admin.last_login_at !== null
          ? toISOStringSafe(admin.last_login_at)
          : undefined,
    },
  };

  return dto;
}
