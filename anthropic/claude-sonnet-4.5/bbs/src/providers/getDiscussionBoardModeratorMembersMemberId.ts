import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorMembersMemberId(props: {
  moderator: ModeratorPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember> {
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: {
      id: props.memberId,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      email_verified: true,
      email_verified_at: true,
      is_suspended: true,
      suspension_reason: true,
      suspended_until: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password: false,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name ?? undefined,
    bio: member.bio ?? undefined,
    avatar_url: member.avatar_url ?? undefined,
    email_verified: member.email_verified,
    email_verified_at: member.email_verified_at
      ? toISOStringSafe(member.email_verified_at)
      : undefined,
    is_suspended: member.is_suspended,
    suspension_reason: member.suspension_reason ?? undefined,
    suspended_until: member.suspended_until
      ? toISOStringSafe(member.suspended_until)
      : undefined,
    last_login_at: member.last_login_at
      ? toISOStringSafe(member.last_login_at)
      : undefined,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
  };
}
