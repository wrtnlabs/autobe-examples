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

export async function postDiscussionBoardMemberReports(props: {
  member: MemberPayload;
  body: IDiscussionBoardReport.ICreate;
}): Promise<IDiscussionBoardReport> {
  const { member, body } = props;

  // Business validation: supported target types
  const supportedTargets = ["article", "comment", "attachment"];
  if (!supportedTargets.includes(body.target_type)) {
    throw new HttpException("Bad Request: unsupported target_type", 400);
  }

  // Verify target existence according to target_type
  if (body.target_type === "article") {
    const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: body.target_id },
      select: { id: true },
    });
    if (!article) throw new HttpException("Not Found", 404);
  } else if (body.target_type === "comment") {
    const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: body.target_id },
      select: { id: true },
    });
    if (!comment) throw new HttpException("Not Found", 404);
  } else {
    const attachment =
      await MyGlobal.prisma.discussion_board_attachments.findUnique({
        where: { id: body.target_id },
        select: { id: true },
      });
    if (!attachment) throw new HttpException("Not Found", 404);
  }

  const now = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.discussion_board_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reporter_member_id: member.id,
        reporter_session_id: member.session_id ?? null,
        target_type: body.target_type,
        target_id: body.target_id,
        reason_category: body.reason_category,
        explanation: body.explanation ?? null,
        status: "pending",
        created_at: now,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      reporter_member_id: created.reporter_member_id as string &
        tags.Format<"uuid">,
      reporter_session_id: created.reporter_session_id ?? undefined,
      target_type: created.target_type,
      target_id: created.target_id as string & tags.Format<"uuid">,
      reason_category:
        created.reason_category as IDiscussionBoardReportReasonCategory,
      explanation: created.explanation ?? undefined,
      status: created.status as IDiscussionBoardReportStatus,
      created_at: now,
      processed_at: created.processed_at
        ? toISOStringSafe(created.processed_at)
        : null,
      closed_at: created.closed_at ? toISOStringSafe(created.closed_at) : null,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Conflict: Report already exists", 409);
    }

    const cid = v4() as string & tags.Format<"uuid">;
    throw new HttpException(`Internal Server Error: ${cid}`, 500);
  }
}
