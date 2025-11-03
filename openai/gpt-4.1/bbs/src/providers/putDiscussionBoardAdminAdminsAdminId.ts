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

export async function putDiscussionBoardAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdmin.IUpdate;
}): Promise<IDiscussionBoardAdmin> {
  const { admin, adminId, body } = props;

  // Check that the target admin exists
  const existing = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: adminId },
  });
  if (!existing) {
    throw new HttpException("Administrator not found", 404);
  }

  // Update admin fields, handle all optionals and nullables per DTO
  let updated;
  try {
    updated = await MyGlobal.prisma.discussion_board_admins.update({
      where: { id: adminId },
      data: {
        email: body.email,
        display_name: body.display_name,
        password_hash: body.password_hash,
        is_locked: body.is_locked,
        avatar_url: body.avatar_url !== undefined ? body.avatar_url : undefined,
        deleted_at: body.deleted_at !== undefined ? body.deleted_at : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch (err) {
    if (
      typeof err === "object" &&
      err &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new HttpException("Email address already in use", 409);
    }
    throw err;
  }

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    avatar_url:
      updated.avatar_url !== undefined ? updated.avatar_url : undefined,
    is_locked: updated.is_locked,
    deleted_at:
      updated.deleted_at !== undefined
        ? updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at)
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
