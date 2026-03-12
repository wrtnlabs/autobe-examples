import { IDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorSession> {
  const session =
    await MyGlobal.prisma.discussion_board_guest_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        discussion_board_guest_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  const now = new Date();
  const isActive = session.expired_at > now;
  return {
    id: session.id,
    user_id: session.discussion_board_guest_id,
    user_type: "guest",
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: session.created_at.toISOString(),
    expired_at: session.expired_at.toISOString(),
    is_active: isActive,
    access_token_expires_at: null,
    refresh_token_expires_at: null,
  };
}
