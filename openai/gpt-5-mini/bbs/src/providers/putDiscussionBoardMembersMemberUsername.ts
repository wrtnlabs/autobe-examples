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

export async function putDiscussionBoardMembersMemberUsername(props: {
  member: MemberPayload;
  memberUsername: string;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  const { member, memberUsername, body } = props;

  // Verify target member exists and is not soft-deleted
  const target = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { username: memberUsername },
  });

  if (!target || target.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: only the account owner may perform updates
  // NOTE: The API description allowed administrators to update members,
  // but this function's props do not include an admin payload. Therefore
  // only ownership is enforced here.
  if (member.id !== target.id) {
    throw new HttpException(
      "Unauthorized: only the account owner may update this resource",
      403,
    );
  }

  // Handle optional password update (business logic permitted)
  let hashedPassword: string | undefined;
  if (body.password !== undefined) {
    const pwd = body.password;
    const categoryCount = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].reduce(
      (acc, rx) => acc + (rx.test(pwd) ? 1 : 0),
      0,
    );
    if (pwd.length < 12 || categoryCount < 3) {
      throw new HttpException(
        "Password does not meet strength requirements",
        400,
      );
    }
    hashedPassword = await PasswordUtil.hash(pwd);
  }

  const now = toISOStringSafe(new Date());

  // Update member inline to provide clear type errors if any
  const updated = await MyGlobal.prisma.discussion_board_member.update({
    where: { id: target.id },
    data: {
      ...(body.display_name !== undefined && {
        display_name: body.display_name,
      }),
      ...(hashedPassword !== undefined && { password_hash: hashedPassword }),
      updated_at: now,
    },
  });

  // If password changed and client requested session revocation, perform revocation and audit
  if (body.password !== undefined && body.revokeSessions === true) {
    // Revoke active sessions for this member
    await MyGlobal.prisma.discussion_board_member_sessions.updateMany({
      where: {
        discussion_board_member_id: target.id,
        OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
      },
      data: { expired_at: now },
    });

    // Audit log entry (append-only). Do NOT include raw password content
    await MyGlobal.prisma.discussion_board_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        event_type: "member.password_change",
        event_timestamp: now,
        resource_type: "member",
        resource_id: target.id,
        actor_type: "member",
        actor_id: member.id,
        metadata: JSON.stringify({ revokeSessions: true }),
        created_at: now,
        updated_at: now,
      },
    });
  }

  // Build sanitized return object according to IDiscussionBoardMember
  return {
    id: updated.id as string & tags.Format<"uuid">,
    username: updated.username,
    display_name: updated.display_name ?? null,
    role: updated.role,
    mfa_enabled: updated.mfa_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
