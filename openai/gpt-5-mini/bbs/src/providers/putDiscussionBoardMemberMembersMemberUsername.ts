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

export async function putDiscussionBoardMemberMembersMemberUsername(props: {
  member: MemberPayload;
  memberUsername: string;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  const { member, memberUsername, body } = props;

  // Fetch target member by username
  const target = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { username: memberUsername },
  });

  if (!target || target.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only owner can update
  if (target.id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the member may update their profile",
      403,
    );
  }

  // Determine which fields will be updated
  const willUpdateDisplayName = body.display_name !== undefined;
  const willUpdatePassword =
    body.password !== undefined && body.password !== null;

  if (!willUpdateDisplayName && !willUpdatePassword) {
    throw new HttpException("Bad Request: No updatable fields provided", 400);
  }

  // Password strength validation and hashing
  let hashedPassword: string | undefined;
  if (willUpdatePassword) {
    // body.password has been checked for !== undefined && !== null above
    const pwd = body.password!;
    // Business rule: min 12 chars
    if (pwd.length < 12)
      throw new HttpException(
        "Bad Request: Password must be at least 12 characters",
        400,
      );
    // At least 3 of 4 categories
    const categories = [
      /[A-Z]/.test(pwd),
      /[a-z]/.test(pwd),
      /[0-9]/.test(pwd),
      /[^A-Za-z0-9]/.test(pwd),
    ];
    const satisfied = categories.filter(Boolean).length;
    if (satisfied < 3)
      throw new HttpException(
        "Bad Request: Password must include at least three of: uppercase, lowercase, number, symbol",
        400,
      );

    hashedPassword = await PasswordUtil.hash(pwd);
  }

  // Prepare timestamp once
  const now = toISOStringSafe(new Date());

  // Inline update - explicit field conversion for nullability
  const updated = await MyGlobal.prisma.discussion_board_member.update({
    where: { id: target.id },
    data: {
      ...(willUpdateDisplayName
        ? { display_name: body.display_name ?? null }
        : {}),
      ...(hashedPassword ? { password_hash: hashedPassword } : {}),
      updated_at: now,
    },
  });

  // Revoke sessions if requested after password change
  if (willUpdatePassword && body.revokeSessions === true) {
    await MyGlobal.prisma.discussion_board_member_sessions.updateMany({
      where: {
        discussion_board_member_id: updated.id,
        expired_at: null,
      },
      data: { expired_at: now },
    });
  }

  // Construct response, converting Date fields to ISO strings
  return {
    id: updated.id,
    username: updated.username,
    display_name: updated.display_name === null ? null : updated.display_name,
    role: updated.role,
    mfa_enabled: updated.mfa_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
