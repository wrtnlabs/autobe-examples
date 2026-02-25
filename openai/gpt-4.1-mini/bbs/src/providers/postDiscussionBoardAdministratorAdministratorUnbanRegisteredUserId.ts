import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdministratorAdministratorUnbanRegisteredUserId(props: {
  administrator: AdministratorPayload;
  registeredUserId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserBan.IErase> {
  // Find the active ban record for the user
  const activeBan = await MyGlobal.prisma.discussion_board_user_bans.findFirst({
    where: {
      registered_user_id: props.registeredUserId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!activeBan) {
    throw new HttpException("The user is not currently banned", 400);
  }
  // Delete the ban record to unban
  await MyGlobal.prisma.discussion_board_user_bans.delete({
    where: { id: activeBan.id },
  });
  return {
    id: activeBan.id,
    success: true,
  };
}
