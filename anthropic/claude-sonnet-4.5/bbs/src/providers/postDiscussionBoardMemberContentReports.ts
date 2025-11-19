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

export async function postDiscussionBoardMemberContentReports(props: {
  member: MemberPayload;
  body: IDiscussionBoardContentReport.ICreate;
}): Promise<IDiscussionBoardContentReport> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.body.discussion_board_article_id },
  });

  if (!article || article.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  const created = await MyGlobal.prisma.discussion_board_content_reports.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_article_id: props.body.discussion_board_article_id,
        discussion_board_member_id: props.member.id,
        report_category: props.body.report_category,
        report_details: props.body.report_details ?? null,
        status: "pending",
        resolved_by_moderator_id: null,
        resolution_notes: null,
        created_at: new Date(),
        resolved_at: null,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    discussion_board_article_id: created.discussion_board_article_id as string &
      tags.Format<"uuid">,
    discussion_board_member_id: created.discussion_board_member_id as string &
      tags.Format<"uuid">,
    resolved_by_moderator_id:
      created.resolved_by_moderator_id === null
        ? undefined
        : (created.resolved_by_moderator_id as string & tags.Format<"uuid">),
    report_category: created.report_category,
    report_details:
      created.report_details === null ? undefined : created.report_details,
    status: created.status as
      | "pending"
      | "reviewed_no_action"
      | "reviewed_edited"
      | "reviewed_removed",
    resolution_notes:
      created.resolution_notes === null ? undefined : created.resolution_notes,
    created_at: toISOStringSafe(created.created_at),
    resolved_at:
      created.resolved_at === null
        ? undefined
        : toISOStringSafe(created.resolved_at),
  };
}
