import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUser> {
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    is_email_verified: user.is_email_verified,
    is_active: user.is_active,
    is_blocked: user.is_blocked,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };
}
