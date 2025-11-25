import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportedContent";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorReportedContentReportedContentId(props: {
  moderator: ModeratorPayload;
  reportedContentId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardReportedContent> {
  const reportedContent =
    await MyGlobal.prisma.discussion_board_reported_content.findUnique({
      where: { id: props.reportedContentId },
      include: {
        article: {
          select: {
            content: true,
          },
        },
        comment: {
          select: {
            content: true,
          },
        },
      },
    });

  if (!reportedContent) {
    throw new HttpException("Reported content not found", 404);
  }

  const content =
    reportedContent.article?.content || reportedContent.comment?.content;
  if (!content) {
    throw new HttpException("Associated content not found", 500);
  }

  return {
    id: reportedContent.id,
    content,
    reason: reportedContent.report_reason,
    reportedBy: reportedContent.discussion_board_registered_user_id,
    createdAt: toISOStringSafe(reportedContent.created_at),
  };
}
