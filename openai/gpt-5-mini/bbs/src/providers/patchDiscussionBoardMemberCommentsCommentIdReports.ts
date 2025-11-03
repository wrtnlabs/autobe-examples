import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberCommentsCommentIdReports(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardReport.ICreate;
}): Promise<IDiscussionBoardReport> {
  const { member, commentId, body } = props;

  // Verify the target comment exists
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: commentId },
  });
  if (!comment) throw new HttpException("Not Found", 404);

  // Check for existing report by this member on the same comment
  const existing = await MyGlobal.prisma.discussion_board_reports.findFirst({
    where: {
      reporter_member_id: member.id,
      target_type: "comment",
      target_id: commentId,
    },
  });
  if (existing) {
    throw new HttpException(
      `Conflict: report already exists (id=${existing.id})`,
      409,
    );
  }

  // Prepare deterministic timestamps
  const createdAt = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.discussion_board_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reporter_member_id: member.id,
        reporter_session_id: member.session_id ?? null,
        target_type: "comment",
        target_id: commentId,
        reason_category: body.reason_category,
        explanation: body.explanation ?? null,
        status: "pending",
        created_at: createdAt,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      reporter_member_id: created.reporter_member_id as string &
        tags.Format<"uuid">,
      reporter_session_id: created.reporter_session_id ?? null,
      target_type: created.target_type,
      target_id: created.target_id as string & tags.Format<"uuid">,
      reason_category: typia.assert<IDiscussionBoardReportReasonCategory>(
        created.reason_category,
      ),
      explanation: created.explanation ?? null,
      status: created.status as IDiscussionBoardReportStatus,
      created_at: createdAt,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const existingAgain =
        await MyGlobal.prisma.discussion_board_reports.findFirst({
          where: {
            reporter_member_id: member.id,
            target_type: "comment",
            target_id: commentId,
          },
        });
      if (existingAgain) {
        throw new HttpException(
          `Conflict: report already exists (id=${existingAgain.id})`,
          409,
        );
      }
      throw new HttpException("Conflict", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
