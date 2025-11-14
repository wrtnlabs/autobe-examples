import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumReportResolveResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumReportResolveResponse";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postPoliticalForumModeratorReportsReportIdResolve(props: {
  moderator: ModeratorPayload;
  reportId: string;
  postId: string;
}): Promise<IPoliticalForumReportResolveResponse> {
  const report = await MyGlobal.prisma.political_forum_post_reports.findUnique({
    where: { id: props.reportId, deleted_at: null },
    include: { post: true },
  });

  let targetPostId: string;

  if (report) {
    targetPostId = report.political_forum_post_id;
  } else {
    const commentReport =
      await MyGlobal.prisma.political_forum_comment_reports.findUnique({
        where: { id: props.reportId, deleted_at: null },
        include: { comment: true },
      });

    if (!commentReport) {
      throw new HttpException("Report not found", 404);
    }

    // Since moderation_actions only link to posts, we need to get the parent post
    targetPostId = commentReport.comment.post_id;
  }

  await MyGlobal.prisma.political_forum_moderation_actions.create({
    data: {
      id: v4(), // Add required id property with generated UUID
      political_forum_moderator_id: props.moderator.id,
      political_forum_post_id: targetPostId,
      action_type: "verify",
      reason: "Report resolved by moderator",
      created_at: toISOStringSafe(new Date()),
    },
  });

  return "Report resolved";
}
