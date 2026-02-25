import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardCommentReportCollector } from "../collectors/DiscussionBoardCommentReportCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardCommentReportTransformer } from "../transformers/DiscussionBoardCommentReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserCommentsCommentIdReports(props: {
  user: UserPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentReport.ICreate;
}): Promise<IDiscussionBoardCommentReport> {
  // Verify the comment exists
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Validate reason length (business requirement)
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Report reason cannot be empty", 400);
  }
  if (props.body.reason.length > 1000) {
    throw new HttpException(
      "Report reason must be 1000 characters or less",
      400,
    );
  }
  try {
    // Transform and create the report
    const report =
      await MyGlobal.prisma.discussion_board_comment_reports.create({
        data: await DiscussionBoardCommentReportCollector.collect({
          body: props.body,
          discussionBoardComments: { id: props.commentId },
          discussionBoardUsers: { id: props.user.id },
          discussionBoardUserSessions: { id: props.user.session_id },
        }),
        ...DiscussionBoardCommentReportTransformer.select(),
      });
    return await DiscussionBoardCommentReportTransformer.transform(report);
  } catch (error) {
    // Handle unique constraint violation
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("You have already reported this comment", 409);
    }
    throw error;
  }
}
