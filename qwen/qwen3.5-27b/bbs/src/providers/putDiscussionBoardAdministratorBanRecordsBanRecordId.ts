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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorBanRecordsBanRecordId(props: {
  administrator: AdministratorPayload;
  banRecordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  // Build update data from the request body
  const updateData: Prisma.discussion_board_ban_recordsUpdateInput = {
    updated_at: new Date(),
  };
  // Conditionally add ban_reason if provided
  if (props.body.ban_reason !== undefined) {
    updateData.ban_reason = props.body.ban_reason;
  }
  // Conditionally add unbanned_at if provided
  if (props.body.unbanned_at !== undefined) {
    updateData.unbanned_at =
      props.body.unbanned_at === null ? null : new Date(props.body.unbanned_at);
  }
  // Update the ban record and fetch with transformer select
  const updated = await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banRecordId },
    data: updateData,
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  // Transform and return the updated record
  return await DiscussionBoardBanRecordTransformer.transform(updated);
}
