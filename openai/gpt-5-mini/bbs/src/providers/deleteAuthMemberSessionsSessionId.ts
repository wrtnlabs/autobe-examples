import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteAuthMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, sessionId } = props;

  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findUnique({
      where: { id: sessionId },
    });

  if (!session) throw new HttpException("Not Found", 404);

  // Authorization: only the session owner may revoke
  if (session.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only revoke your own sessions",
      403,
    );
  }

  const now = toISOStringSafe(new Date());

  // Soft-revoke the session by setting expired_at
  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: { id: sessionId },
    data: { expired_at: now },
  });

  // Audit the revocation - use 'metadata' (schema field) to store payload
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "auth.session_revoked",
      event_timestamp: now,
      resource_type: "session",
      resource_id: sessionId,
      actor_type: "member",
      actor_id: member.id,
      ip: session.ip ?? null,
      metadata: JSON.stringify({
        action: "session_revoked",
        actor_member_id: member.id,
        target_session_id: sessionId,
        ip: session.ip ?? null,
      }),
      created_at: now,
      updated_at: now,
    },
  });
}
