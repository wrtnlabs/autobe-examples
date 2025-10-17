import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getDiscussionBoardAdministratorWarningsWarningId(props: {
  administrator: AdministratorPayload;
  warningId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardWarning> {
  const { administrator, warningId } = props;

  const warning =
    await MyGlobal.prisma.discussion_board_warnings.findUniqueOrThrow({
      where: { id: warningId },
    });

  return {
    id: warning.id as string & tags.Format<"uuid">,
    member_id: warning.member_id as string & tags.Format<"uuid">,
    moderation_action_id: warning.moderation_action_id as string &
      tags.Format<"uuid">,
    content_topic_id:
      warning.content_topic_id === null
        ? undefined
        : (warning.content_topic_id as string & tags.Format<"uuid">),
    content_reply_id:
      warning.content_reply_id === null
        ? undefined
        : (warning.content_reply_id as string & tags.Format<"uuid">),
    warning_level: warning.warning_level,
    violation_category: warning.violation_category,
    moderator_notes: warning.moderator_notes,
    expiration_date: warning.expiration_date
      ? toISOStringSafe(warning.expiration_date)
      : undefined,
    is_active: warning.is_active,
    expired_at: warning.expired_at
      ? toISOStringSafe(warning.expired_at)
      : undefined,
    created_at: toISOStringSafe(warning.created_at),
    updated_at: toISOStringSafe(warning.updated_at),
  };
}
