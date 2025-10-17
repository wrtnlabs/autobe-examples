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
  discussionBoardAdminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdmin.IUpdate;
}): Promise<IDiscussionBoardAdmin> {
  const { admin, discussionBoardAdminId, body } = props;

  const existingAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst(
    {
      where: {
        id: discussionBoardAdminId,
        deleted_at: null,
      },
    },
  );

  if (!existingAdmin) {
    throw new HttpException("Administrator user not found", 404);
  }

  const updated_at = body.updated_at ?? toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.discussion_board_admins.update({
    where: { id: discussionBoardAdminId },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      display_name: body.display_name ?? undefined,
      updated_at,
      deleted_at: body.deleted_at !== undefined ? body.deleted_at : undefined,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    display_name: updated.display_name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
