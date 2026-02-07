import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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

export async function deleteDiscussionBoardAdminBanRecordsBanRecordId(props: {
  admin: AdminPayload;
  banRecordId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanRecord> {
  // First verify the ban record exists
  const existingBanRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banRecordId },
      ...DiscussionBoardBanRecordTransformer.select(),
    });
  if (!existingBanRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Perform hard delete
  await MyGlobal.prisma.discussion_board_ban_records.delete({
    where: { id: props.banRecordId },
  });
  // Return the deleted record information
  return await DiscussionBoardBanRecordTransformer.transform(existingBanRecord);
}
