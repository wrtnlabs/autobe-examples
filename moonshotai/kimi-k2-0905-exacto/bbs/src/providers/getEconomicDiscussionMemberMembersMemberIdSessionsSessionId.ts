import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";
import { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconomicDiscussionMemberMembersMemberIdSessionsSessionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionMemberSession> {
  // Verify that the member is accessing their own session
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden - Cannot access sessions of other members",
      403,
    );
  }

  // Retrieve the session
  const session =
    await MyGlobal.prisma.economic_discussion_member_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Verify session belongs to the requesting member
  if (session.economic_discussion_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - Session does not belong to this member",
      403,
    );
  }

  // Retrieve the member information
  const member = await MyGlobal.prisma.economic_discussion_members.findUnique({
    where: { id: session.economic_discussion_member_id },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: session.id,
    member: {
      id: member.id,
      username: member.username satisfies string as string &
        tags.MaxLength<50> &
        tags.Pattern<"^[a-zA-Z0-9_]{3,50}$">,
      email: member.email satisfies string as string & tags.Format<"email">,
    },
    ip: session.ip,
    href: session.href as string & tags.Format<"uri">,
    referrer: session.referrer ?? undefined,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
