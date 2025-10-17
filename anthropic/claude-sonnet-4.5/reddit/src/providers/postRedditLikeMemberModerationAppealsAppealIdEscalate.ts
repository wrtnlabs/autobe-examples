import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberModerationAppealsAppealIdEscalate(props: {
  member: MemberPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeModerationAppeal> {
  const { member, appealId } = props;

  const appeal =
    await MyGlobal.prisma.reddit_like_moderation_appeals.findUniqueOrThrow({
      where: { id: appealId },
    });

  if (appeal.appellant_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only escalate your own appeals",
      403,
    );
  }

  if (appeal.status !== "upheld") {
    throw new HttpException(
      "Bad Request: Only denied appeals can be escalated",
      400,
    );
  }

  if (appeal.is_escalated === true) {
    throw new HttpException(
      "Bad Request: This appeal has already been escalated",
      400,
    );
  }

  if (appeal.appeal_type === "platform_suspension") {
    throw new HttpException(
      "Bad Request: Platform suspension appeals cannot be escalated further",
      400,
    );
  }

  const currentExpectedResolution = new Date(appeal.expected_resolution_at);
  currentExpectedResolution.setDate(currentExpectedResolution.getDate() + 7);
  const newExpectedResolutionString = toISOStringSafe(
    currentExpectedResolution,
  );

  const escalatedAppeal =
    await MyGlobal.prisma.reddit_like_moderation_appeals.update({
      where: { id: appealId },
      data: {
        is_escalated: true,
        expected_resolution_at: newExpectedResolutionString,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: escalatedAppeal.id,
    appellant_member_id: escalatedAppeal.appellant_member_id,
    appeal_type: escalatedAppeal.appeal_type,
    appeal_text: escalatedAppeal.appeal_text,
    status: escalatedAppeal.status,
    decision_explanation:
      escalatedAppeal.decision_explanation !== null
        ? escalatedAppeal.decision_explanation
        : undefined,
    is_escalated: escalatedAppeal.is_escalated,
    expected_resolution_at: toISOStringSafe(
      escalatedAppeal.expected_resolution_at,
    ),
    created_at: toISOStringSafe(escalatedAppeal.created_at),
    reviewed_at:
      escalatedAppeal.reviewed_at !== null
        ? toISOStringSafe(escalatedAppeal.reviewed_at)
        : undefined,
  };
}
