import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdReports(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentReport.ICreate;
}): Promise<IDiscussionBoardContentReport> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.deleted_at !== null) {
    throw new HttpException("Cannot report a deleted article", 400);
  }

  const existingReport =
    await MyGlobal.prisma.discussion_board_content_reports.findFirst({
      where: {
        discussion_board_article_id: props.articleId,
        discussion_board_member_id: props.member.id,
      },
    });

  if (existingReport) {
    throw new HttpException("You have already reported this article", 400);
  }

  const created = await MyGlobal.prisma.discussion_board_content_reports.create(
    {
      data: {
        id: v4(),
        discussion_board_article_id: props.articleId,
        discussion_board_member_id: props.member.id,
        report_category: props.body.report_category,
        report_details: props.body.report_details ?? null,
        status: "pending",
        resolution_notes: null,
        resolved_by_moderator_id: null,
        created_at: new Date(),
        resolved_at: null,
      },
    },
  );

  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    discussion_board_member_id: created.discussion_board_member_id,
    resolved_by_moderator_id: created.resolved_by_moderator_id ?? undefined,
    report_category: created.report_category,
    report_details: created.report_details ?? undefined,
    status: typia.assert<
      "pending" | "reviewed_no_action" | "reviewed_edited" | "reviewed_removed"
    >(created.status),
    resolution_notes: created.resolution_notes ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    resolved_at: created.resolved_at
      ? toISOStringSafe(created.resolved_at)
      : undefined,
  };
}
