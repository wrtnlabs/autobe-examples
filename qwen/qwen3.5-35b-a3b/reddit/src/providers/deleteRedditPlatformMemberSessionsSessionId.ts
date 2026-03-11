import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query session by ID, verify it exists and is not already expired
  const session =
    await MyGlobal.prisma.reddit_platform_member_sessions.findFirst({
      where: {
        id: props.sessionId,
      },
      select: {
        id: true,
        member_id: true,
        expired_at: true,
      },
    });
  // 404 if session doesn't exist or already expired
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  // 404 if session is already expired
  if (session.expired_at !== null) {
    throw new HttpException("Session already expired", 404);
  }
  // Authorization check: verify actor is authorized
  const isAuthorized =
    props.member.type === "member" && session.member_id === props.member.id;
  if (!isAuthorized) {
    throw new HttpException("Forbidden", 403);
  }
  // Termination: mark session as expired
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_platform_member_sessions.update({
    where: { id: props.sessionId },
    data: { expired_at: now },
  });
}
