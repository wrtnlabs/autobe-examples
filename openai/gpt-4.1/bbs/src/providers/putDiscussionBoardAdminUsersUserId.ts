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
  const existing = await MyGlobal.prisma.discussion_board_users.findUnique({
    where: { id: props.userId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("User not found or already deleted", 404);
  }

  if (props.body.email !== existing.email) {
    const duplicate = await MyGlobal.prisma.discussion_board_users.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        id: { not: props.userId },
      },
    });
    if (duplicate) {
      throw new HttpException("Email already in use", 409);
    }
  }

  const now = toISOStringSafe(new Date());

  // Only allow update of: email, updated_at, deleted_at
  const updateData: {
    email: string;
    updated_at: string;
    deleted_at?: string | null;
  } = {
    email: props.body.email,
    updated_at:
      props.body.updated_at !== undefined ? props.body.updated_at : now,
  };
  if ("deleted_at" in props.body) {
    updateData.deleted_at = props.body.deleted_at ?? null;
  }

  const updated = await MyGlobal.prisma.discussion_board_users.update({
    where: { id: props.userId },
    data: updateData,
  });

  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
