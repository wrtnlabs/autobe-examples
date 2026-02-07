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

export async function patchDiscussionBoardAdminBanIdRevoke(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanRecord.IRevoke;
}): Promise<IDiscussionBoardBanRecord> {
  // First, verify the ban exists and is active
  const existingBan =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banId },
    });
  if (!existingBan) {
    throw new HttpException("Ban record not found", 404);
  }
  if (existingBan.ban_status !== "active") {
    throw new HttpException("Only active bans can be revoked", 400);
  }
  const currentTimestamp = toISOStringSafe(new Date());
  // Update the ban record with revocation details
  const updatedBan = await MyGlobal.prisma.discussion_board_ban_records.update({
    where: { id: props.banId },
    data: {
      ban_status: "revoked",
      revoked_at: currentTimestamp,
      revoked_reason: props.body.revoked_reason ?? null,
      updated_at: currentTimestamp,
    },
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  return await DiscussionBoardBanRecordTransformer.transform(updatedBan);
}
