import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  if (props.memberId !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const existing = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.memberId },
  });

  if (!existing) {
    throw new HttpException("Member not found", 404);
  }

  const updated = await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.memberId },
    data: {
      display_name: props.body.display_name,
      bio: props.body.bio,
      avatar_url: props.body.avatar_url,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    display_name: updated.display_name ?? undefined,
    bio: updated.bio ?? undefined,
    avatar_url: updated.avatar_url ?? undefined,
    email_verified: updated.email_verified,
    email_verified_at: updated.email_verified_at
      ? toISOStringSafe(updated.email_verified_at)
      : undefined,
    is_suspended: updated.is_suspended,
    suspension_reason: updated.suspension_reason ?? undefined,
    suspended_until: updated.suspended_until
      ? toISOStringSafe(updated.suspended_until)
      : undefined,
    last_login_at: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
