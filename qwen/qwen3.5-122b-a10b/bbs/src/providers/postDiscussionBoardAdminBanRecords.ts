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
import { DiscussionBoardBanRecordCollector } from "../collectors/DiscussionBoardBanRecordCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminBanRecords(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.ICreate;
}): Promise<IDiscussionBoardBanRecord> {
  // Validate target member exists
  await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
    where: { id: props.body.discussion_board_member_id },
    select: { id: true },
  });
  // Check for active ban
  const existingActiveBan =
    await MyGlobal.prisma.discussion_board_ban_records.findFirst({
      where: {
        discussion_board_member_id: props.body.discussion_board_member_id,
        unbanned_at: null,
        deleted_at: null,
      },
    });
  if (existingActiveBan !== null) {
    throw new HttpException("Member already has an active ban", 409);
  }
  // Create ban record using collector
  const banRecordData = await DiscussionBoardBanRecordCollector.collect({
    body: props.body,
    discussionBoardAdmins: { id: props.admin.id } satisfies IEntity,
  });
  const created = await MyGlobal.prisma.discussion_board_ban_records.create({
    data: banRecordData,
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  // Update member's ban status
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.body.discussion_board_member_id },
    data: {
      ban_status: "banned",
      ban_reason: props.body.reason,
      updated_at: new Date(),
    },
  });
  // Terminate all active sessions for the banned member
  await MyGlobal.prisma.discussion_board_member_sessions.deleteMany({
    where: {
      discussion_board_member_id: props.body.discussion_board_member_id,
    },
  });
  // Create audit log
  const auditLogId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.discussion_board_audit_logs.create({
    data: {
      id: auditLogId,
      admin_id: props.admin.id,
      actor_type: "admin",
      action_type: "user.ban",
      resource_type: "user",
      resource_id: props.body.discussion_board_member_id,
      metadata: JSON.stringify({
        reason: props.body.reason,
        ban_record_id: created.id,
      }),
      created_at: new Date(),
    },
  });
  return await DiscussionBoardBanRecordTransformer.transform(created);
}
