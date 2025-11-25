import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteDiscussionBoardAdminUserGuestUsersGuestUserId(props: {
  adminUser: AdminuserPayload;
  guestUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Optional safety check to ensure payload type is adminuser
  if (props.adminUser.type !== "adminuser") {
    throw new HttpException("Forbidden", 403);
  }

  const existing = await MyGlobal.prisma.discussion_board_guestusers.findUnique(
    {
      where: {
        id: props.guestUserId,
      },
    },
  );

  if (existing === null) {
    throw new HttpException("Guest user not found", 404);
  }

  await MyGlobal.prisma.discussion_board_guestusers.delete({
    where: {
      id: props.guestUserId,
    },
  });

  return undefined;
}
