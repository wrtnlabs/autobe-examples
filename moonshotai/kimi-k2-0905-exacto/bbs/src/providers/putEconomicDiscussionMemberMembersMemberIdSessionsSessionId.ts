import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";
import { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconomicDiscussionMemberMembersMemberIdSessionsSessionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionMemberSession.IUpdate;
}): Promise<IEconomicDiscussionMemberSession> {
  // First, verify the session exists and get current state
  const session =
    await MyGlobal.prisma.economic_discussion_member_sessions.findUnique({
      where: { id: props.sessionId },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Verify the session belongs to the member in the URL
  if (session.economic_discussion_member_id !== props.memberId) {
    throw new HttpException("Session does not belong to specified member", 404);
  }

  // Verify the authenticated member owns this session
  if (session.economic_discussion_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden - you can only update your own sessions",
      403,
    );
  }

  // Build update data based on provided body fields
  const updateData: any = {};

  if (props.body.ip !== undefined) {
    updateData.ip = props.body.ip;
  }

  if (props.body.referrer !== undefined) {
    updateData.referrer = props.body.referrer;
  }

  if (props.body.expired_at !== undefined) {
    updateData.expired_at = props.body.expired_at
      ? new Date(props.body.expired_at)
      : null;
  }

  // Only allow member ID change if it's not changing ownership
  if (props.body.economic_discussion_member_id !== undefined) {
    if (props.body.economic_discussion_member_id !== props.member.id) {
      throw new HttpException("Cannot change session ownership", 403);
    }
    updateData.economic_discussion_member_id =
      props.body.economic_discussion_member_id;
  }

  // Update the session
  const updatedSession =
    await MyGlobal.prisma.economic_discussion_member_sessions.update({
      where: { id: props.sessionId },
      data: updateData,
    });

  // Get the associated member information
  const member = await MyGlobal.prisma.economic_discussion_members.findUnique({
    where: { id: updatedSession.economic_discussion_member_id },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: updatedSession.id,
    member: {
      id: member.id,
      username: member.username,
      email: member.email,
    },
    ip: updatedSession.ip,
    href: updatedSession.href,
    referrer: updatedSession.referrer ?? undefined,
    created_at: toISOStringSafe(updatedSession.created_at),
    expired_at: updatedSession.expired_at
      ? toISOStringSafe(updatedSession.expired_at)
      : undefined,
  };
}
