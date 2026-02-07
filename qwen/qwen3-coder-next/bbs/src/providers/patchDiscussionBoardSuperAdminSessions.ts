import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSessions(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardMemberSession> {
  const updatedSession =
    await MyGlobal.prisma.discussion_board_member_sessions.update({
      where: {
        id: props.superAdmin.session_id,
      },
      data: {
        is_valid: false,
        expired_at: toISOStringSafe(new Date()),
      },
    });
  return {
    id: updatedSession.id,
    discussion_board_member_id: updatedSession.discussion_board_member_id,
    created_at: toISOStringSafe(updatedSession.created_at),
    expired_at: toISOStringSafe(updatedSession.expired_at),
    last_activity_at: updatedSession.last_activity_at
      ? toISOStringSafe(updatedSession.last_activity_at)
      : null,
    is_valid: updatedSession.is_valid,
    user_agent: updatedSession.user_agent ?? undefined,
    metadata: updatedSession.metadata ?? undefined,
    ip: updatedSession.ip,
    referrer: updatedSession.referrer ?? undefined,
    href: updatedSession.href ?? undefined,
  };
}
