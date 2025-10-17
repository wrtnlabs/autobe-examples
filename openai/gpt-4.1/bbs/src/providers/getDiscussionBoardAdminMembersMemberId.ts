import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminMembersMemberId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember> {
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.memberId },
      select: {
        id: true,
        email: true,
        username: true,
        email_verified: true,
        registration_completed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    email_verified: member.email_verified,
    registration_completed_at: toISOStringSafe(
      member.registration_completed_at,
    ),
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    ...(member.deleted_at !== null && member.deleted_at !== undefined
      ? { deleted_at: toISOStringSafe(member.deleted_at) }
      : {}),
  };
}
