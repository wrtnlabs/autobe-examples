import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMemberSession";
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

export async function getHrmTrackerMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string;
}): Promise<IHrmTrackerMemberSession> {
  const session =
    await MyGlobal.prisma.hrm_tracker_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        user_agent: true,
        created_at: true,
        expires_at: true,
        revoked_at: true,
        last_activity_at: true,
        member_id: true,
        member: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
            phone: true,
            status: true,
            email_verified: true,
          },
        },
      },
    });
  if (session.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: session.id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    ip: session.ip,
    user_agent: session.user_agent ?? null,
    created_at: toISOStringSafe(session.created_at),
    expires_at: toISOStringSafe(session.expires_at),
    revoked_at: session.revoked_at ? toISOStringSafe(session.revoked_at) : null,
    last_activity_at: toISOStringSafe(session.last_activity_at),
    member: {
      id: session.member.id,
      display_name: session.member.display_name,
      avatar_url: session.member.avatar_url ?? null,
      phone: session.member.phone ?? null,
      status: session.member.status as "active" | "deactivated",
      email_verified: session.member.email_verified,
    } satisfies IHrmTrackerMember.ISummary,
  } satisfies IHrmTrackerMemberSession;
}
