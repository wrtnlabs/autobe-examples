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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardBansBanIdAppeals(props: {
  banId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBanAppeal.ICreate;
}): Promise<IDiscussionBoardBanAppeal> {
  // This operation requires user authentication context which is not available
  // in the current function signature. The database schema requires a user
  // relationship (discussion_board_user_id) which cannot be resolved without
  // authentication context.
  // Validate ban record exists
  const banRecord =
    await MyGlobal.prisma.discussion_board_ban_records.findUnique({
      where: { id: props.banId },
    });
  if (!banRecord) {
    throw new HttpException("Ban record not found", 404);
  }
  // Check if ban is active
  if (banRecord.ban_status !== "active") {
    throw new HttpException("Cannot appeal an inactive ban", 400);
  }
  // Check for existing pending appeal
  const existingAppeal =
    await MyGlobal.prisma.discussion_board_ban_appeals.findFirst({
      where: {
        discussion_board_ban_record_id: props.banId,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingAppeal) {
    throw new HttpException(
      "A pending appeal already exists for this ban",
      400,
    );
  }
  // Cannot proceed without user authentication context
  throw new HttpException("Authentication required to submit ban appeal", 401);
}
