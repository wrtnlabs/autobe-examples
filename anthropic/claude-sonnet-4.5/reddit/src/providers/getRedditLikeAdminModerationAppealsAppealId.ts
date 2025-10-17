import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditLikeAdminModerationAppealsAppealId(props: {
  admin: AdminPayload;
  appealId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeModerationAppeal> {
  const { admin, appealId } = props;

  const appeal =
    await MyGlobal.prisma.reddit_like_moderation_appeals.findUniqueOrThrow({
      where: { id: appealId },
    });

  return {
    id: appeal.id as string & tags.Format<"uuid">,
    appellant_member_id: appeal.appellant_member_id as string &
      tags.Format<"uuid">,
    appeal_type: appeal.appeal_type,
    appeal_text: appeal.appeal_text,
    status: appeal.status,
    decision_explanation: appeal.decision_explanation ?? undefined,
    is_escalated: appeal.is_escalated,
    expected_resolution_at: toISOStringSafe(appeal.expected_resolution_at),
    created_at: toISOStringSafe(appeal.created_at),
    reviewed_at: appeal.reviewed_at
      ? toISOStringSafe(appeal.reviewed_at)
      : undefined,
  };
}
