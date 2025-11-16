import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deleteDiscussionBoardMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember> {
  // Verify ownership - member can only delete their own account
  if (props.member.id !== props.memberId) {
    throw new HttpException("You can only delete your own account", 403);
  }

  // Fetch the member record before deletion to return it
  const memberToDelete =
    await MyGlobal.prisma.discussion_board_members.findUnique({
      where: {
        id: props.memberId,
      },
    });

  if (!memberToDelete) {
    throw new HttpException("Member not found", 404);
  }

  // Perform hard delete
  await MyGlobal.prisma.discussion_board_members.delete({
    where: {
      id: props.memberId,
    },
  });

  // Return the deleted member information
  return {
    id: memberToDelete.id,
    username: memberToDelete.username,
    email: memberToDelete.email,
    status: memberToDelete.status,
    email_verified: memberToDelete.email_verified,
    created_at: toISOStringSafe(memberToDelete.created_at),
    updated_at: toISOStringSafe(memberToDelete.updated_at),
  };
}
