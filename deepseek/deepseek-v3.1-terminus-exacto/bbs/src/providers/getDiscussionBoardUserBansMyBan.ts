import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardBanRecordTransformer } from "../transformers/DiscussionBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserBansMyBan(props: {
  user: UserPayload;
}): Promise<IDiscussionBoardBanRecord> {
  // First verify the user exists and is not deleted
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Find the most recent active ban for the current user
  const banRecord = await MyGlobal.prisma.discussion_board_user_bans.findFirst({
    where: {
      banned_user_id: props.user.id,
      OR: [
        { ban_status: "active" },
        {
          ban_status: "active",
          ban_ends_at: { gt: new Date() },
        },
      ],
    },
    orderBy: {
      ban_started_at: "desc",
    },
    ...DiscussionBoardBanRecordTransformer.select(),
  });
  if (!banRecord) {
    throw new HttpException("No active ban found for this user", 404);
  }
  return await DiscussionBoardBanRecordTransformer.transform(banRecord);
}
