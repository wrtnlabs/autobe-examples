import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAbuseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAbuseReport";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postDiscussionBoardUserAbuseReports(props: {
  user: UserPayload;
  body: IDiscussionBoardAbuseReport.ICreate;
}): Promise<IDiscussionBoardAbuseReport> {
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_abuse_reports.create({
    data: {
      id: v4(),
      reporter_user_id: props.user.id,
      target_article_id: props.body.target_article_id ?? undefined,
      target_comment_id: props.body.target_comment_id ?? undefined,
      abuse_category: props.body.abuse_category,
      reason: props.body.reason,
      status: "pending",
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    reporter_user_id: created.reporter_user_id,
    target_article_id: created.target_article_id ?? undefined,
    target_comment_id: created.target_comment_id ?? undefined,
    abuse_category: created.abuse_category,
    reason: created.reason,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
