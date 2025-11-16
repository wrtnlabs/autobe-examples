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
  // Step 1: Retrieve existing admin
  const existing = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Admin not found", 404);
  }

  // Step 2: Enforce business logic
  // Cannot have both active and blocked set to true
  if (props.body.is_active && props.body.is_blocked) {
    throw new HttpException("Account cannot be both active and blocked", 400);
  }

  // Email must be unique (ignore this record)
  const duplicate = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      email: props.body.email,
      id: { not: props.adminId },
      deleted_at: null,
    },
  });
  if (duplicate) {
    throw new HttpException("Email already in use by another admin", 409);
  }

  // Step 3: Hash new password
  const password_hash = await PasswordUtil.hash(props.body.password);

  // Step 4: Update record
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discussion_board_admins.update({
    where: { id: props.adminId },
    data: {
      email: props.body.email,
      password_hash,
      is_email_verified: props.body.is_email_verified,
      is_active: props.body.is_active,
      is_blocked: props.body.is_blocked,
      updated_at: now,
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
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
