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
  // Step 1: Fetch target admin record by ID
  const existing = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!existing) {
    throw new HttpException("Admin not found", 404);
  }

  // Step 2: Prepare changes
  let emailToSet: string | undefined = undefined;
  if (
    typeof props.body.email === "string" &&
    props.body.email !== existing.email
  ) {
    // Check uniqueness (ignore self and deleted)
    const emailExists = await MyGlobal.prisma.discussion_board_admins.findFirst(
      {
        where: {
          email: props.body.email,
          id: { not: props.adminId },
          deleted_at: null,
        },
      },
    );
    if (emailExists) {
      throw new HttpException("Admin email must be unique", 409);
    }
    emailToSet = props.body.email;
  }

  // Step 3: Password hashing
  let passwordHashToSet: string | undefined = undefined;
  if (
    typeof props.body.password === "string" &&
    props.body.password.length > 0
  ) {
    passwordHashToSet = await PasswordUtil.hash(props.body.password);
  }

  // Step 4: Handle soft delete/reactivation for deleted_at
  let deletedAtToSet: string | null | undefined = undefined;
  if (Object.prototype.hasOwnProperty.call(props.body, "deleted_at")) {
    // Accept either null (reactivation) or valid string
    deletedAtToSet =
      props.body.deleted_at === undefined
        ? undefined
        : props.body.deleted_at === null
          ? null
          : props.body.deleted_at;
  }

  // Step 5: Construct update fields
  const dataToUpdate: Record<string, unknown> = {
    ...(emailToSet !== undefined && { email: emailToSet }),
    ...(passwordHashToSet !== undefined && {
      password_hash: passwordHashToSet,
    }),
    ...(deletedAtToSet !== undefined && { deleted_at: deletedAtToSet }),
    updated_at: toISOStringSafe(
      /* current timestamp, cannot use Date type */ new Date(),
    ),
  };

  // Step 6: Update record
  const updated = await MyGlobal.prisma.discussion_board_admins.update({
    where: { id: props.adminId },
    data: dataToUpdate,
  });

  // Step 7: Return API-safe admin entity
  return {
    id: updated.id,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "string"
        ? updated.deleted_at
        : updated.deleted_at === null
          ? null
          : undefined,
  };
}
