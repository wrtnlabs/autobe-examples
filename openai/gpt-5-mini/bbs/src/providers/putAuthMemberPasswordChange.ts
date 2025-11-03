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

export async function putAuthMemberPasswordChange(props: {
  member: MemberPayload;
  body: IDiscussionBoardMember.IChangePassword;
}): Promise<void> {
  const { member, body } = props;

  // Retrieve member; throws if not found
  const existing =
    await MyGlobal.prisma.discussion_board_member.findUniqueOrThrow({
      where: { id: member.id },
    });

  // If member is soft-deleted, treat as not found
  if (existing.deleted_at) {
    throw new HttpException("Not Found", 404);
  }

  // Verify current password against stored hash
  const valid = await PasswordUtil.verify(
    body.currentPassword,
    existing.password_hash,
  );
  if (!valid) {
    throw new HttpException("Invalid current password", 400);
  }

  // Hash new password
  const hashed = await PasswordUtil.hash(body.newPassword);

  // Single timestamp for consistency
  const now = toISOStringSafe(new Date());

  // Update password hash and updated_at
  await MyGlobal.prisma.discussion_board_member.update({
    where: { id: member.id },
    data: {
      password_hash: hashed,
      updated_at: now,
    },
  });

  // Optionally revoke active sessions by setting expired_at
  if (body.revokeSessions) {
    await MyGlobal.prisma.discussion_board_member_sessions.updateMany({
      where: {
        discussion_board_member_id: member.id,
        OR: [{ expired_at: null }, { expired_at: { gt: new Date() } }],
      },
      data: {
        expired_at: now,
      },
    });
  }

  // Append audit log entry for password change
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "member.password_change",
      event_timestamp: now,
      actor_type: "member",
      actor_id: member.id,
      metadata: JSON.stringify({
        revokeSessions: body.revokeSessions ?? false,
      }),
      created_at: now,
      updated_at: now,
    },
  });
}
