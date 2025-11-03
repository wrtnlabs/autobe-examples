import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { IEDiscussionBoardAppealStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEDiscussionBoardAppealStatus";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberAppeals(props: {
  member: MemberPayload;
  body: IDiscussionBoardAppeal.ICreate;
}): Promise<IDiscussionBoardAppeal> {
  const { member, body } = props;

  // Business rule: require at least one reference id
  if (
    (body.moderation_action_id === undefined ||
      body.moderation_action_id === null) &&
    (body.report_id === undefined || body.report_id === null)
  ) {
    throw new HttpException(
      "Bad Request: Either moderation_action_id or report_id must be provided",
      400,
    );
  }

  // Verify referenced moderation action exists if provided
  if (
    body.moderation_action_id !== undefined &&
    body.moderation_action_id !== null
  ) {
    const existing =
      await MyGlobal.prisma.discussion_board_moderation_actions.findUnique({
        where: { id: body.moderation_action_id },
        select: { id: true },
      });
    if (!existing) throw new HttpException("Moderation action not found", 404);
  }

  // Verify referenced report exists if provided
  if (body.report_id !== undefined && body.report_id !== null) {
    const existing = await MyGlobal.prisma.discussion_board_reports.findUnique({
      where: { id: body.report_id },
      select: { id: true },
    });
    if (!existing) throw new HttpException("Report not found", 404);
  }

  const now = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.discussion_board_appeals.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        appellant_member_id: member.id,
        moderation_action_id: body.moderation_action_id ?? null,
        report_id: body.report_id ?? null,
        explanation: body.explanation,
        status: "pending",
        created_at: now,
      },
    });

    // Fire-and-forget side-effects (audit + queue). Run in background but await to ensure persistence.
    const auditPayload = JSON.stringify({
      appeal_id: created.id,
      appellant_member_id: created.appellant_member_id,
      moderation_action_id: created.moderation_action_id ?? null,
      report_id: created.report_id ?? null,
      explanation: created.explanation,
    });

    await Promise.all([
      MyGlobal.prisma.discussion_board_moderation_audit.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          moderation_action_id: created.moderation_action_id ?? null,
          report_id: created.report_id ?? null,
          actor_moderator_id: null,
          event_type: "appeal.submitted",
          event_payload: auditPayload,
          occurred_at: now,
        },
      }),
      // Placeholder for enqueueing moderator task - implement as a no-op DB record when needed.
      Promise.resolve(),
    ]);

    return {
      id: created.id as string & tags.Format<"uuid">,
      appellant_member_id: created.appellant_member_id as string &
        tags.Format<"uuid">,
      moderation_action_id: created.moderation_action_id ?? null,
      report_id: created.report_id ?? null,
      explanation: created.explanation,
      status: created.status as IEDiscussionBoardAppealStatus,
      created_at: toISOStringSafe(created.created_at),
      resolved_at: created.resolved_at
        ? toISOStringSafe(created.resolved_at)
        : null,
      resolution_reason: created.resolution_reason ?? null,
    };
  } catch (e) {
    if (e instanceof HttpException) throw e;
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        throw new HttpException("Conflict: duplicate appeal", 409);
      }
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
