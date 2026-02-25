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

export async function postDiscussionBoardUserBansBanIdAppeals(props: {
  user: UserPayload;
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.ICreate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Validate appeal reason meets minimum length requirement
  if (props.body.appeal_reason.trim().length < 10) {
    throw new HttpException(
      "Appeal reason must contain at least 10 characters of substantive content",
      400,
    );
  }
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Verify ban exists and check status
    const banRecord = await tx.discussion_board_ban_records.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        ban_status: true,
      },
    });
    // Check if ban is eligible for appeal (not expired or revoked)
    if (
      banRecord.ban_status === "expired" ||
      banRecord.ban_status === "revoked"
    ) {
      throw new HttpException(
        "Cannot appeal a ban that is no longer active",
        400,
      );
    }
    // Check if appeal already exists for this ban
    const existingAppeal = await tx.discussion_board_ban_appeals.findFirst({
      where: {
        discussion_board_ban_record_id: props.banId,
        discussion_board_user_id: props.user.id,
        deleted_at: null,
      },
    });
    if (existingAppeal) {
      throw new HttpException(
        "An appeal has already been submitted for this ban. Please wait for the review process.",
        409,
      );
    }
    // Use collector to create appeal data with proper ID generation
    const appealData = await DiscussionBoardBanAppealCollector.collect({
      body: props.body,
      discussionBoardBanRecords: { id: props.banId },
      discussionBoardUsers: { id: props.user.id },
    });
    // Create the appeal and return it with transformer data
    const createdAppeal = await tx.discussion_board_ban_appeals.create({
      data: appealData,
      ...DiscussionBoardBanAppealTransformer.select(),
    });
    return createdAppeal;
  });
  // Transform the result to API response format
  return await DiscussionBoardBanAppealTransformer.transform(result);
}
