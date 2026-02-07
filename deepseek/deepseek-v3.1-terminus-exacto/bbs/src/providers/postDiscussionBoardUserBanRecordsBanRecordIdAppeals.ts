import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanAppealCollector } from "../collectors/DiscussionBoardBanAppealCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardBanAppealTransformer } from "../transformers/DiscussionBoardBanAppealTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserBanRecordsBanRecordIdAppeals(props: {
  user: UserPayload;
  banRecordId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.ICreate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Validate that the ban record exists and is active
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banRecordId },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  if (banRecord.ban_status !== "active") {
    throw new HttpException("Cannot appeal an inactive ban", 400);
  }
  // Check if user already has an appeal for this ban record
  const existingAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
      where: {
        discussion_board_ban_record_id: props.banRecordId,
        discussion_board_user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (existingAppeal) {
    throw new HttpException(
      "You have already submitted an appeal for this ban",
      400,
    );
  }
  // Create the appeal using the collector
  const createInput = await DiscussionBoardBanAppealCollector.collect({
    body: props.body,
    discussionBoardBanRecords: { id: props.banRecordId },
    discussionBoardUsers: { id: props.user.id },
  });
  const created = await MyGlobal.prisma.discussion_board_ban_appeals.create({
    data: createInput,
    ...DiscussionBoardBanAppealTransformer.select(),
  });
  return await DiscussionBoardBanAppealTransformer.transform(created);
}
