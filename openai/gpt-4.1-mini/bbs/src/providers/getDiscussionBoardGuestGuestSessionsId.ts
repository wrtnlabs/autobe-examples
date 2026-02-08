import { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
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

export async function getDiscussionBoardGuestGuestSessionsId(props: {
  guest: GuestPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardGuestSession> {
  const record =
    await MyGlobal.prisma.discussion_board_guest_sessions.findUnique({
      where: { id: props.id },
    });
  if (!record) {
    throw new HttpException("Guest session not found", 404);
  }
  const createdAt = toISOStringSafe(record.created_at);
  const expiredAt =
    record.expired_at === null ? null : toISOStringSafe(record.expired_at);
  return {
    ...record,
    created_at: createdAt,
    expired_at: expiredAt,
  };
}
