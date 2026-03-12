import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorBanRecords(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardBanRecord.ICreate;
}): Promise<IDiscussionBoardBanRecord> {
  // Check if target user already has an active ban
  if (props.body.actor_type === "member" && props.body.member_id) {
    const existingBan =
      await MyGlobal.prisma.discussion_board_ban_records.findFirst({
        where: {
          deleted_at: null,
          unbanned_at: null,
          memberBanRecord: {
            member: {
              id: props.body.member_id,
            },
          },
        },
      });
    if (existingBan) {
      throw new HttpException("User is already banned", 400);
    }
  } else if (
    props.body.actor_type === "administrator" &&
    props.body.administrator_id
  ) {
    const existingBan =
      await MyGlobal.prisma.discussion_board_ban_records.findFirst({
        where: {
          deleted_at: null,
          unbanned_at: null,
          administratorBanRecord: {
            administrator: {
              id: props.body.administrator_id,
            },
          },
        },
      });
    if (existingBan) {
      throw new HttpException("User is already banned", 400);
    }
  }
  // Create ban record using collector
  const banRecord = await MyGlobal.prisma.discussion_board_ban_records.create({
    data: await DiscussionBoardBanRecordCollector.collect({
      body: props.body,
      discussionBoardAdministrators: {
        id: props.administrator.id,
      },
    }),
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  // Create subtype record
  if (props.body.actor_type === "member" && props.body.member_id) {
    await MyGlobal.prisma.discussion_board_ban_record_of_members.create({
      data: {
        id: v4(),
        banRecord: {
          connect: { id: banRecord.id },
        },
        member: {
          connect: { id: props.body.member_id },
        },
      },
    });
    // Update member's banned flag
    await MyGlobal.prisma.discussion_board_members.update({
      where: { id: props.body.member_id },
      data: { banned: true },
    });
  } else if (
    props.body.actor_type === "administrator" &&
    props.body.administrator_id
  ) {
    await MyGlobal.prisma.discussion_board_ban_record_of_administrators.create({
      data: {
        id: v4(),
        banRecord: {
          connect: { id: banRecord.id },
        },
        administrator: {
          connect: { id: props.body.administrator_id },
        },
      },
    });
  }
  return await DiscussionBoardBanRecordTransformer.transform(banRecord);
}
