import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";

export async function postDiscussionBoardDiscussionBoardMembers(props: {
  body: IDiscussionBoardDiscussionBoardMember.ICreate;
}): Promise<IDiscussionBoardDiscussionBoardMember> {
  const existingMember =
    await MyGlobal.prisma.discussion_board_member.findUnique({
      where: { email: props.body.email },
    });

  if (existingMember) {
    throw new HttpException("Email already in use", 409);
  }

  const hashedPassword = await PasswordUtil.hash(props.body.password);
  const nowISO = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.discussion_board_member.create({
    data: {
      id,
      email: props.body.email,
      password_hash: hashedPassword,
      nickname: props.body.nickname,
      created_at: nowISO,
      updated_at: nowISO,
    },
  });

  return {
    id: created.id,
    email: created.email,
    nickname: created.nickname,
    status: "active",
    role: "user",
    created_at: toISOStringSafe(created.created_at),
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : undefined,
  };
}
