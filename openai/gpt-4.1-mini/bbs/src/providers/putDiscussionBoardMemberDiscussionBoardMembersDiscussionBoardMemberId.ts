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

export async function putDiscussionBoardMemberDiscussionBoardMembersDiscussionBoardMemberId(props: {
  member: MemberPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  const { member, discussionBoardMemberId, body } = props;

  if (member.id !== discussionBoardMemberId) {
    throw new HttpException(
      "Forbidden: Cannot update other members accounts",
      403,
    );
  }

  await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
    where: { id: discussionBoardMemberId },
  });

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_members.update({
    where: { id: discussionBoardMemberId },
    data: {
      email: body.email,
      password_hash: await PasswordUtil.hash(body.password),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password: body.password,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
