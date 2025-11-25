import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteEconomicDiscussionMemberMembersMemberIdSessionsSessionId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the authenticated member matches the target memberId
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "Forbidden - Can only delete your own sessions",
      403,
    );
  }

  // Verify the session exists and belongs to the member
  const session =
    await MyGlobal.prisma.economic_discussion_member_sessions.findFirst({
      where: {
        id: props.sessionId,
        economic_discussion_member_id: props.memberId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Delete the session
  await MyGlobal.prisma.economic_discussion_member_sessions.delete({
    where: { id: props.sessionId },
  });
}
