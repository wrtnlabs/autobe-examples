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
    throw new HttpException("Forbidden: Cannot update another member", 403);
  }

  if (body.email !== undefined) {
    const existingMember =
      await MyGlobal.prisma.discussion_board_members.findFirst({
        where: {
          email: body.email,
          id: {
            not: discussionBoardMemberId,
          },
          deleted_at: null,
        },
      });

    if (existingMember !== null) {
      throw new HttpException("Conflict: Email already in use", 409);
    }
  }

  let password_hash: string | undefined = undefined;
  if (body.password !== undefined) {
    password_hash = await PasswordUtil.hash(body.password);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_members.update({
    where: {
      id: discussionBoardMemberId,
    },
    data: {
      email: body.email ?? undefined,
      password_hash: password_hash ?? undefined,
      display_name: body.display_name ?? undefined,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
