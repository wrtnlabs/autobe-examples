import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberAppealsAppealId(props: {
  member: MemberPayload;
  appealId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAppeal.IUpdate;
}): Promise<IDiscussionBoardAppeal> {
  const { member, appealId, body } = props;

  const appeal =
    await MyGlobal.prisma.discussion_board_appeals.findUniqueOrThrow({
      where: { id: appealId },
    });

  if (appeal.member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own appeals",
      403,
    );
  }

  if (appeal.status !== "pending_review") {
    throw new HttpException(
      "Appeals can only be updated while in pending_review status",
      400,
    );
  }

  const updated = await MyGlobal.prisma.discussion_board_appeals.update({
    where: { id: appealId },
    data: {
      appeal_explanation: body.appeal_explanation ?? undefined,
      additional_evidence: body.additional_evidence ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    appeal_explanation: updated.appeal_explanation,
    additional_evidence:
      updated.additional_evidence === null
        ? undefined
        : updated.additional_evidence,
    status: updated.status,
    decision: updated.decision === null ? undefined : updated.decision,
    decision_reasoning:
      updated.decision_reasoning === null
        ? undefined
        : updated.decision_reasoning,
    corrective_action_taken:
      updated.corrective_action_taken === null
        ? undefined
        : updated.corrective_action_taken,
    submitted_at: toISOStringSafe(updated.submitted_at),
    reviewed_at: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
