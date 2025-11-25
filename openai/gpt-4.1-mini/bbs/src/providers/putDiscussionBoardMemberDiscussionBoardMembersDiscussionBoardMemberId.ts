import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberDiscussionBoardMembersDiscussionBoardMemberId(props: {
  member: MemberPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardDiscussionBoardMember> {
  const existing = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { id: props.discussionBoardMemberId },
    select: {
      id: true,
      email: true,
      password_hash: true,
      nickname: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Discussion board member not found", 404);
  }

  if (existing.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.discussion_board_member.update({
    where: { id: props.discussionBoardMemberId },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.nickname !== undefined && {
        nickname: props.body.nickname,
      }),
      ...(props.body.password !== undefined && {
        password_hash: await PasswordUtil.hash(props.body.password),
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    nickname: updated.nickname,
    created_at: toISOStringSafe(updated.created_at),
    updated_at:
      updated.updated_at === null
        ? undefined
        : toISOStringSafe(updated.updated_at),
  } as unknown as IDiscussionBoardDiscussionBoardMember;
}
