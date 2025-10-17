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

export async function getDiscussionBoardMemberAppealsAppealId(props: {
  member: MemberPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAppeal> {
  const { member, appealId } = props;

  const appeal =
    await MyGlobal.prisma.discussion_board_appeals.findUniqueOrThrow({
      where: { id: appealId },
    });

  if (appeal.member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only access your own appeals",
      403,
    );
  }

  return {
    id: appeal.id as string & tags.Format<"uuid">,
    appeal_explanation: appeal.appeal_explanation,
    additional_evidence: appeal.additional_evidence ?? undefined,
    status: appeal.status,
    decision: appeal.decision ?? undefined,
    decision_reasoning: appeal.decision_reasoning ?? undefined,
    corrective_action_taken: appeal.corrective_action_taken ?? undefined,
    submitted_at: toISOStringSafe(appeal.submitted_at),
    reviewed_at: appeal.reviewed_at
      ? toISOStringSafe(appeal.reviewed_at)
      : undefined,
    created_at: toISOStringSafe(appeal.created_at),
    updated_at: toISOStringSafe(appeal.updated_at),
  };
}
