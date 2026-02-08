import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
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

export async function getCommunityPlatformGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserSession> {
  const record =
    await MyGlobal.prisma.community_platform_user_sessions.findUnique({
      where: { id: props.sessionId },
    });
  if (!record) throw new HttpException("Session not found", 404);
  if (record.user_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: record.id,
    user_id: record.user_id,
    ip: record.ip,
    href: record.href,
    referrer: record.referrer,
    created_at: record.created_at ? toISOStringSafe(record.created_at) : null,
    expired_at: record.expired_at ? toISOStringSafe(record.expired_at) : null,
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
