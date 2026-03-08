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

export async function postDiscussionBoardAdminAdminBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.ICreate;
}): Promise<IDiscussionBoardBanRecord> {
  // Step 1: Verify target member exists
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.body.discussionBoardMemberId },
      select: { ban_status: true },
    });
  // Step 2: Check member is not already banned
  if (member.ban_status === "banned") {
    throw new HttpException("Member is already banned", 400);
  }
  // Step 3: Create ban record using collector
  const created = await MyGlobal.prisma.discussion_board_ban_records.create({
    data: await DiscussionBoardBanRecordCollector.collect({
      body: props.body,
      discussionBoardAdmins: {
        id: props.admin.id,
      },
    }),
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  // Step 4: Update member's ban status
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.body.discussionBoardMemberId },
    data: {
      ban_status: "banned",
      ban_reason: props.body.reason,
    },
  });
  // Step 5: Transform and return response
  return await DiscussionBoardBanRecordTransformer.transform(created);
}
