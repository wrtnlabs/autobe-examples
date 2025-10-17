import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteDiscussionBoardAdministratorUsersUserId(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { userId } = props;

  // Verify the target user exists before attempting deletion
  // findUniqueOrThrow will automatically throw 404 if user not found
  await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
    where: { id: userId },
  });

  // Perform hard delete of the user account
  // Database CASCADE constraints automatically remove all related data:
  // - Sessions, login history, password resets
  // - Topics, replies, votes, favorites
  // - Blocked users, reputation records
  // - Reports, moderation actions, warnings, suspensions, bans
  // - Notifications, audit logs, security logs
  await MyGlobal.prisma.discussion_board_members.delete({
    where: { id: userId },
  });
}
