import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserGuestUsersGuestUserId(props: {
  adminUser: AdminuserPayload;
  guestUserId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardGuestUser> {
  const guestUserRecord =
    await MyGlobal.prisma.discussion_board_guestusers.findUnique({
      where: {
        id: props.guestUserId,
      },
    });

  if (guestUserRecord === null) {
    throw new HttpException("Guest user not found", 404);
  }

  return {
    id: guestUserRecord.id,
    anonymous_token: guestUserRecord.anonymous_token,
    created_at: toISOStringSafe(guestUserRecord.created_at),
    updated_at: toISOStringSafe(guestUserRecord.updated_at),
    deleted_at:
      guestUserRecord.deleted_at !== null
        ? toISOStringSafe(guestUserRecord.deleted_at)
        : null,
  };
}
