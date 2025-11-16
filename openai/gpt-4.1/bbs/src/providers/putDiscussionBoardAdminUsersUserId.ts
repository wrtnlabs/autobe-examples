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

export async function putDiscussionBoardAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardUser.IUpdate;
}): Promise<IDiscussionBoardUser> {
  const user = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  if (props.body.email !== undefined && props.body.email !== user.email) {
    const conflict = await MyGlobal.prisma.discussion_board_users.findFirst({
      where: { email: props.body.email },
    });
    if (conflict) {
      throw new HttpException("Email address is already in use.", 409);
    }
  }

  const updated = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.userId },
    data: {
      ...(props.body.email !== undefined ? { email: props.body.email } : {}),
      ...(props.body.is_email_verified !== undefined
        ? { is_email_verified: props.body.is_email_verified }
        : {}),
      ...(props.body.is_active !== undefined
        ? { is_active: props.body.is_active }
        : {}),
      ...(props.body.is_blocked !== undefined
        ? { is_blocked: props.body.is_blocked }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    is_email_verified: updated.is_email_verified,
    is_active: updated.is_active,
    is_blocked: updated.is_blocked,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
