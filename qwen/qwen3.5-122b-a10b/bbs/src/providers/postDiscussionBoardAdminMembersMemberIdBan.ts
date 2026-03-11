import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardMemberTransformer } from "../transformers/DiscussionBoardMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminMembersMemberIdBan(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMember.IBan;
}): Promise<IDiscussionBoardMember> {
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.memberId },
      select: { id: true, ban_status: true },
    });
  if (member.ban_status === "banned") {
    throw new HttpException("Member is already banned", 409);
  }
  if (props.body.reason === null) {
    throw new HttpException("Ban reason is required", 400);
  }
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Ban reason is required", 400);
  }
  const now = new Date();
  const banRecordId = v4();
  const auditLogId = v4();
  const banReason: string = props.body.reason;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_ban_records.create({
      data: {
        id: banRecordId,
        discussion_board_member_id: props.memberId,
        discussion_board_admin_id: props.admin.id,
        reason: banReason,
        banned_at: now,
        unbanned_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    await tx.discussion_board_members.update({
      where: { id: props.memberId },
      data: {
        ban_status: "banned",
        ban_reason: banReason,
        updated_at: now,
      },
    });
    await tx.discussion_board_member_sessions.deleteMany({
      where: { discussion_board_member_id: props.memberId },
    });
    await tx.discussion_board_audit_logs.create({
      data: {
        id: auditLogId,
        admin_id: props.admin.id,
        actor_type: "admin",
        action_type: "user.ban",
        resource_type: "user",
        resource_id: props.memberId,
        metadata: JSON.stringify({ reason: banReason }),
        ip_address: null,
        user_agent: null,
        created_at: now,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.memberId },
      ...DiscussionBoardMemberTransformer.select(),
    });
  return await DiscussionBoardMemberTransformer.transform(updated);
}
