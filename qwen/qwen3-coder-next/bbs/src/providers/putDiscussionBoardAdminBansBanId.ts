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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanRecordAtSummaryTransformer } from "../transformers/DiscussionBoardBanRecordAtSummaryTransformer";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IUpdate;
}): Promise<IDiscussionBoardBanRecord> {
  // Find existing ban record with proper select
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banId },
      ...DiscussionBoardBanRecordAtSummaryTransformer.select(),
    });
  // Update ban record - always update ban_reason and optionally unban_reason
  const updated = await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banId },
    data: {
      ban_reason: props.body.ban_reason,
      unban_reason: props.body.unban_reason,
      unbanned_at:
        props.body.unban_reason !== undefined &&
        props.body.unban_reason !== null
          ? new Date()
          : undefined,
      updated_at: new Date(),
    },
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  // Transform to response DTO
  return await DiscussionBoardBanRecordTransformer.transform(updated);
}
