import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function postAuthMemberPasswordReset(props: {
  body: IDiscussionBoardMember.IResetPassword;
}): Promise<IDiscussionBoardMember> {
  const { body } = props;

  try {
    const reset =
      await MyGlobal.prisma.discussion_board_password_resets.findUnique({
        where: { token: body.token },
      });

    if (!reset) throw new HttpException("Invalid token", 404);
    if (reset.consumed_at)
      throw new HttpException("Token already consumed", 400);

    const now = toISOStringSafe(new Date());

    if (reset.expires_at && toISOStringSafe(reset.expires_at) <= now) {
      throw new HttpException("Token expired", 400);
    }

    // Business-rule: enforce strong password
    const password = body.password;
    const lengthOk = password.length >= 12;
    const classes = [
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];
    const classesOk = classes.filter(Boolean).length >= 3;
    if (!lengthOk || !classesOk) throw new HttpException("Weak password", 400);

    const hashed = await PasswordUtil.hash(password);

    const memberId = reset.discussion_board_member_id;
    if (!memberId)
      throw new HttpException("Invalid token: no member linked", 404);

    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.discussion_board_password_resets.update({
        where: { id: reset.id },
        data: { consumed_at: now },
      }),

      MyGlobal.prisma.discussion_board_member.update({
        where: { id: memberId },
        data: { password_hash: hashed, updated_at: now },
      }),

      MyGlobal.prisma.discussion_board_member_sessions.updateMany({
        where: { discussion_board_member_id: memberId, expired_at: null },
        data: { expired_at: now },
      }),

      MyGlobal.prisma.discussion_board_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          event_type: "auth.password_reset",
          event_timestamp: now,
          resource_type: "member",
          resource_id: memberId,
          actor_type: "member",
          actor_id: memberId,
          ip: reset.request_ip ?? null,
          metadata: JSON.stringify({ note: "password reset via token" }),
          created_at: now,
          updated_at: now,
        },
      }),
    ]);

    const member = await MyGlobal.prisma.discussion_board_member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new HttpException("Member not found", 404);

    return {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      display_name: member.display_name ?? undefined,
      role: member.role,
      mfa_enabled: member.mfa_enabled,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at: member.deleted_at
        ? toISOStringSafe(member.deleted_at)
        : undefined,
    };
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Internal Server Error", 500);
  }
}
