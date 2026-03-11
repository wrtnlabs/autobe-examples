import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBanRecordsBanRecordIdUnban(props: {
  admin: AdminPayload;
  banRecordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUnban;
}): Promise<IDiscussionBoardBanRecord> {
  const now = new Date();
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banRecordId },
      select: {
        id: true,
        discussion_board_member_id: true,
        unbanned_at: true,
      },
    });
  if (banRecord.unbanned_at !== null) {
    throw new HttpException("User is not currently banned", 400);
  }
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: banRecord.discussion_board_member_id },
      select: { id: true, ban_status: true },
    });
  if (member.ban_status !== "banned") {
    throw new HttpException("User is not currently banned", 400);
  }
  await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banRecordId },
    data: {
      unbanned_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: member.id },
    data: {
      ban_status: "active",
      ban_reason: null,
      updated_at: now,
    },
  });
  const auditLogId = v4();
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: auditLogId,
      action_type: "user.unban",
      admin_id: props.admin.id,
      actor_type: "admin",
      resource_type: "user",
      resource_id: member.id,
      metadata: JSON.stringify({
        ban_record_id: props.banRecordId,
        unban_timestamp: now.toISOString(),
      }),
      created_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banRecordId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  return await DiscussionBoardBanRecordTransformer.transform(updated);
}
