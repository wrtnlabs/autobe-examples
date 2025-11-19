import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminId(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string;
  body: IDiscussionBoardAdmin.IUpdate;
}): Promise<IDiscussionBoardAdmin> {
  const existing = await MyGlobal.prisma.discussion_board_admin.findUnique({
    where: { id: props.discussionBoardAdminId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Discussion Board Admin not found", 404);
  }

  if (props.body.email !== undefined && props.body.email !== existing.email) {
    const emailExists = await MyGlobal.prisma.discussion_board_admin.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.discussionBoardAdminId },
        deleted_at: null,
      },
    });

    if (emailExists) {
      throw new HttpException("Email address already in use", 400);
    }
  }

  const updated = await MyGlobal.prisma.discussion_board_admin.update({
    where: { id: props.discussionBoardAdminId },
    data: {
      email: props.body.email,
      nickname: props.body.nickname,
      deleted_at: props.body.deleted_at ?? null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    nickname: updated.nickname,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null,
  };
}
