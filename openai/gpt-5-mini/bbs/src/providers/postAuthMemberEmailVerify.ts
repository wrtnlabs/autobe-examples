import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function postAuthMemberEmailVerify(props: {
  body: IDiscussionBoardMember.IVerifyEmail;
}): Promise<IDiscussionBoardMember> {
  const { body } = props;
  const { token } = body;

  const verification =
    await MyGlobal.prisma.discussion_board_email_verifications.findUnique({
      where: { token },
    });

  if (!verification)
    throw new HttpException("Verification token not found", 404);

  if (verification.consumed_at !== null) {
    throw new HttpException("Verification token already consumed", 409);
  }

  const now = toISOStringSafe(new Date());

  if (
    verification.expires_at &&
    toISOStringSafe(verification.expires_at) < now
  ) {
    throw new HttpException("Verification token expired", 410);
  }

  const consumed =
    await MyGlobal.prisma.discussion_board_email_verifications.updateMany({
      where: { id: verification.id, consumed_at: null },
      data: { consumed_at: now },
    });

  if (consumed.count === 0) {
    throw new HttpException("Verification token already consumed", 409);
  }

  const updatedMember = await MyGlobal.prisma.discussion_board_member.update({
    where: { id: verification.discussion_board_member_id },
    data: { updated_at: now },
  });

  return {
    id: updatedMember.id as string & tags.Format<"uuid">,
    username: updatedMember.username,
    display_name: updatedMember.display_name ?? undefined,
    role: updatedMember.role,
    mfa_enabled: updatedMember.mfa_enabled,
    created_at: toISOStringSafe(updatedMember.created_at),
    updated_at: toISOStringSafe(updatedMember.updated_at),
    deleted_at: updatedMember.deleted_at
      ? toISOStringSafe(updatedMember.deleted_at)
      : null,
  } as unknown as IDiscussionBoardMember;
}
