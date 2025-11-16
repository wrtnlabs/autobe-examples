import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportOfAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportOfAttachment";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserReportsReportIdAttachment(props: {
  adminUser: AdminuserPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReportOfAttachment.IInvert> {
  // Step 1: load the base report
  const report = await MyGlobal.prisma.discussion_board_reports.findUnique({
    where: {
      id: props.reportId,
    },
  });

  if (report === null) {
    throw new HttpException("Report not found", 404);
  }

  // Ensure this report is attachment-targeting, if target_type field exists and is meaningful
  if (report.target_type !== "attachment") {
    throw new HttpException("No attachment associated with this report", 404);
  }

  // Step 2: find the link row in discussion_board_report_of_attachments
  const link =
    await MyGlobal.prisma.discussion_board_report_of_attachments.findFirst({
      where: {
        discussion_board_report_id: props.reportId,
      },
    });

  if (link === null) {
    throw new HttpException("Attachment link for report not found", 404);
  }

  // Step 3: load the attachment itself
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findUnique({
      where: {
        id: link.discussion_board_attachment_id,
      },
    });

  if (attachment === null) {
    throw new HttpException("Reported attachment not found", 404);
  }

  // Step 4: build the DTO
  const invert: IDiscussionBoardReportOfAttachment.IInvert = {
    id: link.id,
    discussion_board_report_id: link.discussion_board_report_id,
    discussion_board_attachment_id: link.discussion_board_attachment_id,
    created_at: toISOStringSafe(link.created_at),
    report: {
      id: report.id,
      target_type: report.target_type,
      reporter_type: report.reporter_type,
      reason_code: report.reason_code,
      description: report.description === null ? null : report.description,
      status: report.status,
      action: report.action,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
    },
    attachment: {
      id: attachment.id,
      discussion_board_article_id: attachment.discussion_board_article_id,
      file_uri: attachment.file_uri,
      file_name: attachment.file_name,
      content_type: attachment.content_type,
      file_size: attachment.file_size,
      order_in_article: attachment.order_in_article,
      status: attachment.status,
      created_at: toISOStringSafe(attachment.created_at),
      updated_at: toISOStringSafe(attachment.updated_at),
      deleted_at:
        attachment.deleted_at === null
          ? undefined
          : toISOStringSafe(attachment.deleted_at),
    },
  };

  return invert;
}
