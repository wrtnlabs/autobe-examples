import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminActorsBan(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBanRecord.IRequest;
}): Promise<IDiscussionBoardBanRecord> {
  // Check for existing active ban
  const existingBan =
    await MyGlobal.prisma.discussion_board_ban_records.findFirst({
      where: {
        discussion_board_member_id: props.body.discussion_board_member_id,
        deleted_at: null,
      },
    });
  if (existingBan && existingBan.unbanned_at === null) {
    throw new HttpException("User is already banned", 409);
  }
  // Prevent self-ban
  if (existingBan?.administrator_id === props.superAdmin.id) {
    throw new HttpException("Cannot ban yourself", 400);
  }
  // Create ban record
  const ban = await MyGlobal.prisma.discussion_board_ban_records.create({
    data: {
      id: v4(),
      discussion_board_member_id: props.body.discussion_board_member_id,
      administrator_id: props.superAdmin.id,
      ban_reason: props.body.ban_reason,
      banned_at: new Date().toISOString(),
      unbanned_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  return await DiscussionBoardBanRecordTransformer.transform(ban);
}
