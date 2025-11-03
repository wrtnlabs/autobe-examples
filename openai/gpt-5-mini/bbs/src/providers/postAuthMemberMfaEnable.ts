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

export async function postAuthMemberMfaEnable(props: {
  member: MemberPayload;
  body: IDiscussionBoardMember.IEnableTwoFactor;
}): Promise<IDiscussionBoardMember> {
  const { member, body } = props;

  // Verify member existence and not soft-deleted
  const existing = await MyGlobal.prisma.discussion_board_member.findUnique({
    where: { id: member.id },
  });
  if (!existing) throw new HttpException("Not Found", 404);
  if (existing.deleted_at !== null) throw new HttpException("Not Found", 404);

  // Timestamp used for DB updates and audit entries
  const now = toISOStringSafe(new Date());

  // Enable MFA and update timestamp
  const updated = await MyGlobal.prisma.discussion_board_member.update({
    where: { id: member.id },
    data: {
      mfa_enabled: true,
      updated_at: now,
    },
  });

  // Append an audit log entry describing the enrollment initiation
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      event_type: "auth.member.mfa.enabled",
      event_timestamp: now,
      actor_type: "member",
      actor_id: member.id,
      metadata: JSON.stringify({
        method: body.method,
        return_qr_svg: body.return_qr_svg ?? null,
      }),
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    username: updated.username,
    display_name:
      updated.display_name === null ? undefined : updated.display_name,
    role: updated.role,
    mfa_enabled: updated.mfa_enabled,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
