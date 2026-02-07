import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMembersMemberId(props: {
  memberId: string;
}): Promise<IDiscussionBoardMember> {
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.memberId },
  });
  if (!member) throw new HttpException("Member not found", 404);
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    bio: member.bio === null ? undefined : member.bio,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };
}
