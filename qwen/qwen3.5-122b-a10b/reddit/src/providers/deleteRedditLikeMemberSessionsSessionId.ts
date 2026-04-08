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

export async function deleteRedditLikeMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the session and verify it exists (throws 404 if not found)
  const session =
    await MyGlobal.prisma.reddit_like_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: { reddit_like_member_id: true },
    });
  // Verify ownership - member can only delete their own sessions
  if (session.reddit_like_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the session (hard delete - no soft delete column)
  await MyGlobal.prisma.reddit_like_member_sessions.delete({
    where: { id: props.sessionId },
  });
}
