import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCommentReport";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postPoliticalForumCitizenCommentsCommentIdReports(props: {
  citizen: CitizenPayload;
  commentId: string & tags.Format<"uuid">;
  body: IPoliticalForumCommentReport.ICreate;
}): Promise<IPoliticalForumCommentReport> {
  // Verify the target comment exists
  const comment = await MyGlobal.prisma.political_forum_comments.findUnique({
    where: {
      id: props.commentId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new HttpException("Comment not found or has been deleted", 404);
  }

  // Check if a report from this citizen already exists on this comment
  const existingReport =
    await MyGlobal.prisma.political_forum_comment_reports.findFirst({
      where: {
        political_forum_citizen_id: props.citizen.id,
        political_forum_comment_id: props.commentId,
      },
    });

  if (existingReport) {
    throw new HttpException("You have already reported this comment", 409);
  }

  // Create the report record
  const report = await MyGlobal.prisma.political_forum_comment_reports.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      political_forum_citizen_id: props.citizen.id,
      political_forum_comment_id: props.commentId,
      reason: props.body,
      status: "pending",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the report's ID as string to match the IPoliticalForumCommentReport = string type
  return report.id;
}
