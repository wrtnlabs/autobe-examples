import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postDiscussionBoardMemberUserReports(props: {
  memberUser: MemberuserPayload;
  body: IDiscussionBoardReport.ICreate;
}): Promise<IDiscussionBoardReport> {
  const { memberUser, body } = props;

  const targetArticleId = body.target_article_id;
  const targetCommentId = body.target_comment_id;
  const targetAttachmentId = body.target_attachment_id;

  const providedTargetsCount = [
    targetArticleId !== undefined,
    targetCommentId !== undefined,
    targetAttachmentId !== undefined,
  ].filter((flag) => flag).length;

  if (providedTargetsCount === 0) {
    throw new HttpException(
      "Exactly one of target_article_id, target_comment_id, or target_attachment_id must be provided",
      400,
    );
  }

  if (providedTargetsCount > 1) {
    throw new HttpException(
      "Only one of target_article_id, target_comment_id, or target_attachment_id can be provided",
      400,
    );
  }

  let targetType: string;

  if (targetArticleId !== undefined) targetType = "article";
  else if (targetCommentId !== undefined) targetType = "comment";
  else targetType = "attachment";

  const now = toISOStringSafe(new Date());
  const reportId = v4();

  // Verify existence of target entity before creating the report
  if (targetType === "article") {
    const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: targetArticleId as string },
    });

    if (article === null) {
      throw new HttpException("Target article not found", 404);
    }
  } else if (targetType === "comment") {
    const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: targetCommentId as string },
    });

    if (comment === null) {
      throw new HttpException("Target comment not found", 404);
    }
  } else {
    const attachment =
      await MyGlobal.prisma.discussion_board_attachments.findUnique({
        where: { id: targetAttachmentId as string },
      });

    if (attachment === null) {
      throw new HttpException("Target attachment not found", 404);
    }
  }

  const reporterType = "memberuser";
  const status = "submitted";
  const action = "none";

  const [report] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_reports.create({
      data: {
        id: reportId,
        target_type: targetType,
        reporter_type: reporterType,
        reason_code: body.category,
        description: body.reason,
        status,
        action,
        created_at: now,
        updated_at: now,
      },
    }),
    ...(targetType === "article" && targetArticleId !== undefined
      ? [
          MyGlobal.prisma.discussion_board_report_of_articles.create({
            data: {
              id: v4(),
              discussion_board_report_id: reportId,
              discussion_board_article_id:
                targetArticleId satisfies string as string,
              created_at: now,
            },
          }),
        ]
      : []),
    ...(targetType === "comment" && targetCommentId !== undefined
      ? [
          MyGlobal.prisma.discussion_board_report_of_comments.create({
            data: {
              id: v4(),
              discussion_board_report_id: reportId,
              discussion_board_comment_id:
                targetCommentId satisfies string as string,
              created_at: now,
            },
          }),
        ]
      : []),
    ...(targetType === "attachment" && targetAttachmentId !== undefined
      ? [
          MyGlobal.prisma.discussion_board_report_of_attachments.create({
            data: {
              id: v4(),
              discussion_board_report_id: reportId,
              discussion_board_attachment_id:
                targetAttachmentId satisfies string as string,
              created_at: now,
            },
          }),
        ]
      : []),
    MyGlobal.prisma.discussion_board_report_of_memberusers.create({
      data: {
        id: v4(),
        discussion_board_report_id: reportId,
        discussion_board_memberuser_id: memberUser.id,
        created_at: now,
      },
    }),
  ]);

  return {
    id: report.id,
    target_type: report.target_type,
    reporter_type: report.reporter_type,
    reason_code: report.reason_code,
    description: report.description ?? null,
    status: report.status,
    action: report.action,
    created_at: toISOStringSafe(report.created_at as unknown as Date),
    updated_at: toISOStringSafe(report.updated_at as unknown as Date),
  };
}
