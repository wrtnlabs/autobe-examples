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

export async function getDiscussionBoardMemberAppealsAppealId(props: {
  member: MemberPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAppeal> {
  const { member, appealId } = props;

  const record = await MyGlobal.prisma.discussion_board_appeals
    .findUniqueOrThrow({
      where: { id: appealId },
    })
    .catch(() => {
      throw new HttpException("Appeal not found", 404);
    });

  if (record.appellant_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only access your own appeals",
      403,
    );
  }

  return {
    id: record.id as string & tags.Format<"uuid">,
    appellant_member_id: record.appellant_member_id as string &
      tags.Format<"uuid">,
    moderation_action_id:
      record.moderation_action_id === null
        ? undefined
        : (record.moderation_action_id as string & tags.Format<"uuid">),
    report_id:
      record.report_id === null
        ? undefined
        : (record.report_id as string & tags.Format<"uuid">),
    explanation: record.explanation,
    status: record.status as IEDiscussionBoardAppealStatus,
    created_at: toISOStringSafe(record.created_at),
    resolved_at: record.resolved_at
      ? toISOStringSafe(record.resolved_at)
      : null,
    resolution_reason: record.resolution_reason ?? null,
  };
}
