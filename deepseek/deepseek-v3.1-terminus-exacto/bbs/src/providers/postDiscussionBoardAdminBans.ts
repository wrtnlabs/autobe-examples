import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardUserBanCollector } from "../collectors/DiscussionBoardUserBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardUserBanTransformer } from "../transformers/DiscussionBoardUserBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardUserBan.ICreate;
}): Promise<IDiscussionBoardUserBan> {
  // Validate ban duration consistency
  if (
    props.body.ban_duration_type === "temporary" &&
    !props.body.ban_duration_days
  ) {
    throw new HttpException("Temporary ban requires duration days", 400);
  }
  if (
    props.body.ban_duration_type === "permanent" &&
    props.body.ban_duration_days
  ) {
    throw new HttpException("Permanent ban should not have duration days", 400);
  }
  // Verify banned user exists
  const bannedUser = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.body.banned_user_id },
  });
  if (!bannedUser) {
    throw new HttpException("Banned user not found", 404);
  }
  // Check if user is already banned
  const existingBan =
    await MyGlobal.prisma.discussion_board_user_bans.findFirst({
      where: {
        banned_user_id: props.body.banned_user_id,
        ban_status: { in: ["active", "pending"] },
      },
    });
  if (existingBan) {
    throw new HttpException("User is already banned", 400);
  }
  // Create ban record using collector
  const created = await MyGlobal.prisma.discussion_board_user_bans.create({
    data: await DiscussionBoardUserBanCollector.collect({
      body: props.body,
      discussionBoardAdmins: { id: props.admin.id },
    }),
    ...DiscussionBoardUserBanTransformer.select(),
  });
  return await DiscussionBoardUserBanTransformer.transform(created);
}
