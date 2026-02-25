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
export async function postDiscussionBoardUserBansMyBanAppeals(props: {
  user: UserPayload;
  body: IDiscussionBoardBanAppeal.ICreate;
}): Promise<IDiscussionBoardBanAppeal> {
  // Find active ban for the user
  const activeBan = await MyGlobal.prisma.discussion_board_user_bans.findFirst({
    where: {
      banned_user_id: props.user.id,
      ban_status: "active",
      OR: [
        { ban_duration_type: "permanent" },
        {
          ban_duration_type: "temporary",
          ban_ends_at: { gt: new Date() },
        },
      ],
    },
  });
  if (!activeBan) {
    throw new HttpException("No active ban found to appeal", 400);
  }
  // Create the ban appeal
  const createData = await DiscussionBoardBanAppealCollector.collect({
    body: props.body,
    discussionBoardBanRecords: { id: activeBan.id },
    discussionBoardUsers: { id: props.user.id },
  });
  const created = await MyGlobal.prisma.discussion_board_ban_appeals.create({
    data: createData,
    ...DiscussionBoardBanAppealTransformer.select(),
  });
  return DiscussionBoardBanAppealTransformer.transform(created);
}
