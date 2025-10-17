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

export async function putRedditLikeMemberModerationAppealsAppealIdEscalate(props: {
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

  if (appeal.is_escalated) {
    throw new HttpException(
      "Bad Request: This appeal has already been escalated",
      400,
    );
  }

  if (appeal.appeal_type === "platform_suspension") {
    throw new HttpException(
      "Bad Request: Platform suspension appeals cannot be escalated",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const expectedResolution = toISOStringSafe(
    new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
  );

  const updated = await MyGlobal.prisma.reddit_like_moderation_appeals.update({
    where: { id: appealId },
    data: {
      is_escalated: true,
      status: "under_review",
      expected_resolution_at: expectedResolution,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    appellant_member_id: updated.appellant_member_id,
    appeal_type: updated.appeal_type,
    appeal_text: updated.appeal_text,
    status: updated.status,
    decision_explanation: updated.decision_explanation ?? undefined,
    is_escalated: updated.is_escalated,
    expected_resolution_at: toISOStringSafe(updated.expected_resolution_at),
    created_at: toISOStringSafe(updated.created_at),
    reviewed_at: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : undefined,
  };
}
