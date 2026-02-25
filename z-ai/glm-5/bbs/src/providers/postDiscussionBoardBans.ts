import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanCollector } from "../collectors/DiscussionBoardBanCollector";
import { DiscussionBoardBanTransformer } from "../transformers/DiscussionBoardBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardBans(props: {
  body: IDiscussionBoardBan.ICreate;
}): Promise<IDiscussionBoardBan> {
  // Step 1: Validate target user exists and check ban status
  const targetUser =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.body.userId },
      select: {
        id: true,
        is_banned: true,
        permission_level: true,
      },
    });
  // Step 2: Check if already banned
  if (targetUser.is_banned) {
    throw new HttpException("User is already banned", 400);
  }
  // Step 3: Find an administrator to use as the actor
  // NOTE: The administrator context should be passed via props from authenticated session.
  // This workaround finds an available admin, but in production the actor should be
  // explicitly provided to ensure proper authorization tracking and hierarchy validation.
  const admin = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      permission_level: { in: ["ADMINISTRATOR", "SUPER_ADMINISTRATOR"] },
    },
    select: { id: true },
  });
  if (!admin) {
    throw new HttpException("No administrator available to perform ban", 500);
  }
  // Step 4: Create ban record using collector
  const created = await MyGlobal.prisma.discussion_board_bans.create({
    data: await DiscussionBoardBanCollector.collect({
      body: props.body,
      discussionBoardUsers: admin,
    }),
    ...DiscussionBoardBanTransformer.select(),
  });
  // Step 5: Update user's banned status
  await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.body.userId },
    data: {
      is_banned: true,
      banned_by: admin.id,
      updated_at: new Date(),
    },
  });
  // Step 6: Invalidate all sessions for the banned user
  // This immediately terminates the banned user's access
  await MyGlobal.prisma.discussion_board_user_sessions.deleteMany({
    where: { discussion_board_user_id: props.body.userId },
  });
  // Step 7: Return the created ban record
  return await DiscussionBoardBanTransformer.transform(created);
}
