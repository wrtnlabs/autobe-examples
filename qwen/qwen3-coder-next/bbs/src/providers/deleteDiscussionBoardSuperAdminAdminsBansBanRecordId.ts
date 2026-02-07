import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminAdminsBansBanRecordId(props: {
  superAdmin: SuperadminPayload;
  banRecordId: string;
}): Promise<void> {
  const banRecord =
    await MyGlobal.prisma.discussion_board_bans_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  await MyGlobal.prisma.discussion_board_bans_ban_records.delete({
    where: { id: props.banRecordId },
  });
  // Log administrative action for audit trail
  await MyGlobal.prisma.discussion_board_bans_admin_logs.create({
    data: {
      id: v4(),
      admin_id: props.superAdmin.id,
      user_id: banRecord.user_id,
      action_type: "unban",
      ban_start_time: toISOStringSafe(new Date()),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
