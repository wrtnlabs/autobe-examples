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

export async function putDiscussionBoardMemberMembersMemberId(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  if (props.member.id !== props.memberId) {
    throw new HttpException("You can only update your own profile", 403);
  }

  const existing = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.memberId },
  });

  if (!existing) {
    throw new HttpException("Member not found", 404);
  }

  if (props.body.username !== undefined) {
    const usernameConflict =
      await MyGlobal.prisma.discussion_board_members.findFirst({
        where: {
          username: props.body.username,
          id: { not: props.memberId },
        },
      });

    if (usernameConflict) {
      throw new HttpException("Username is already taken", 400);
    }
  }

  const updated = await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.memberId },
    data: {
      ...(props.body.username !== undefined && {
        username: props.body.username,
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    username: updated.username,
    email: updated.email,
    status: updated.status,
    email_verified: updated.email_verified,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
