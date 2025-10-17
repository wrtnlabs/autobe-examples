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

export async function putDiscussionBoardAdminMembersMemberId(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  const { memberId, body } = props;
  // 1. Fetch member
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: memberId },
  });
  if (!member) throw new HttpException("Member not found", 404);
  if (member.deleted_at !== null)
    throw new HttpException("Cannot update a soft-deleted member.", 409);

  // 2. Check for duplicate email/username
  if (body.email && body.email !== member.email) {
    const exists = await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { email: body.email, id: { not: memberId } },
    });
    if (exists)
      throw new HttpException("A member with this email already exists.", 409);
  }
  if (body.username && body.username !== member.username) {
    const exists = await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { username: body.username, id: { not: memberId } },
    });
    if (exists)
      throw new HttpException(
        "A member with this username already exists.",
        409,
      );
  }

  // 3. Prepare update object
  const update: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (body.email !== undefined) update.email = body.email;
  if (body.username !== undefined) update.username = body.username;
  if (body.email !== undefined && body.email !== member.email) {
    update.email_verified = false;
  } else if (body.email_verified !== undefined) {
    update.email_verified = body.email_verified;
  }
  if (body.registration_completed_at !== undefined)
    update.registration_completed_at = toISOStringSafe(
      body.registration_completed_at,
    );

  // 4. Update member
  const updated = await MyGlobal.prisma.discussion_board_members.update({
    where: { id: memberId },
    data: update,
  });
  // 5. Format response
  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    email_verified: updated.email_verified,
    registration_completed_at: toISOStringSafe(
      updated.registration_completed_at,
    ),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
