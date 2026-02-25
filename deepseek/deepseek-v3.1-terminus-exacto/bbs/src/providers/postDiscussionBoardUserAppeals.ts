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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardUserAppeals(props: {
  user: UserPayload;
  body: IDiscussionBoardBanAppeal.ICreate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Find active ban record for the user through ban_appeals relationship
  const banRecords =
    await MyGlobal.prisma.discussion_board_ban_records.findMany({
      where: {
        ban_status: "active",
        banAppeals: {
          none: {
            status: { in: ["pending", "under_review"] },
            deleted_at: null,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  if (banRecords.length === 0) {
    throw new HttpException(
      "No active ban found or appeal already submitted",
      400,
    );
  }
  const activeBan = banRecords[0];
  // Check if appeal already exists for this ban record
  const existingAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
      where: {
        discussion_board_ban_record_id: activeBan.id,
        status: { in: ["pending", "under_review"] },
        deleted_at: null,
      },
    });
  if (existingAppeal) {
    throw new HttpException("Appeal already exists for this ban record", 400);
  }
  // Validate appeal reason minimum length (business rule)
  if (props.body.appeal_reason.trim().length < 10) {
    throw new HttpException(
      "Appeal reason must be at least 10 characters",
      400,
    );
  }
  // Create the appeal using collector
  const appealData = await DiscussionBoardBanAppealCollector.collect({
    body: props.body,
    discussionBoardBanRecords: { id: activeBan.id },
    discussionBoardUsers: { id: props.user.id },
  });
  const appeal = await MyGlobal.prisma.discussion_board_ban_appeals.create({
    data: appealData,
    ...DiscussionBoardBanAppealTransformer.select(),
  });
  // Transform and return the response
  return await DiscussionBoardBanAppealTransformer.transform(appeal);
}
