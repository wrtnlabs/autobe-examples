import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmins } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmins";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putDiscussionBoardAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdmins.IUpdate;
}): Promise<IDiscussionBoardAdmins> {
  // 1. Lookup target admin
  const target = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!target) throw new HttpException("Admin not found", 404);

  // 2. Authorization: must be self or admin privilege
  if (props.admin.id !== target.id) {
    // Only allow self-update for now (no privilege elevation in business spec)
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }

  // 3. Unique email check (if updating email)
  if (props.body.email !== undefined && props.body.email !== target.email) {
    const conflict = await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.adminId },
      },
    });
    if (conflict) {
      throw new HttpException("Email address is already in use", 409);
    }
  }

  // 4. Unique username check (if updating username)
  if (
    props.body.username !== undefined &&
    props.body.username !== target.username
  ) {
    const conflict = await MyGlobal.prisma.discussion_board_admins.findFirst({
      where: {
        username: props.body.username,
        id: { not: props.adminId },
      },
    });
    if (conflict) {
      throw new HttpException("Username is already in use", 409);
    }
  }

  // 5. Perform update
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_admins.update({
    where: { id: props.adminId },
    data: {
      email: props.body.email ?? undefined,
      username: props.body.username ?? undefined,
      updated_at: now,
    },
  });

  // 6. Return updated profile with correct date/string handling
  return {
    id: updated.id,
    email: updated.email,
    username: updated.username,
    email_verified: updated.email_verified,
    registration_completed_at: toISOStringSafe(
      updated.registration_completed_at,
    ),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
