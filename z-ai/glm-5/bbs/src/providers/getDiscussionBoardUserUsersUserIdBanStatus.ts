import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardBanStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanStatus";
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
import { DiscussionBoardBanAtSummaryTransformer } from "../transformers/DiscussionBoardBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserUsersUserIdBanStatus(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardBanStatus> {
  // Authorization check - only administrators can access
  const admin = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: { permission_level: true },
  });
  if (
    admin.permission_level !== "ADMINISTRATOR" &&
    admin.permission_level !== "SUPER_ADMINISTRATOR"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Get target user
  const targetUser =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: props.userId },
      select: { is_banned: true },
    });
  // If not banned, return early
  if (!targetUser.is_banned) {
    return {
      isBanned: false,
      ban: null,
    } satisfies IDiscussionBoardBanStatus;
  }
  // Get the most recent ban record
  const ban = await MyGlobal.prisma.discussion_board_bans.findFirstOrThrow({
    where: { discussion_board_user_id: props.userId },
    orderBy: { created_at: "desc" },
    ...DiscussionBoardBanAtSummaryTransformer.select(),
  });
  return {
    isBanned: true,
    ban: await DiscussionBoardBanAtSummaryTransformer.transform(ban),
  } satisfies IDiscussionBoardBanStatus;
}
