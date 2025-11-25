import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdministrator";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoAppAdminAdministratorsAdministratorId(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
  body: ITodoAppAdministrator.IUpdate;
}): Promise<ITodoAppAdministrator> {
  // Verify the target administrator exists and is not soft-deleted
  const existing = await MyGlobal.prisma.todo_app_administrators.findFirst({
    where: {
      id: props.administratorId,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Administrator not found", 404);
  }

  // Validate email uniqueness if email is being updated
  if (props.body.email !== undefined && props.body.email !== existing.email) {
    const emailExists = await MyGlobal.prisma.todo_app_administrators.findFirst(
      {
        where: {
          email: props.body.email,
          id: { not: props.administratorId },
          deleted_at: null,
        },
      },
    );

    if (emailExists) {
      throw new HttpException("Email address already exists", 409);
    }
  }

  // Validate role_level enum values
  if (props.body.role_level !== undefined) {
    const validRoleLevels = ["super_admin", "admin", "moderator"];
    if (!validRoleLevels.includes(props.body.role_level)) {
      throw new HttpException("Invalid role level", 400);
    }
  }

  // Validate status enum values
  if (props.body.status !== undefined) {
    const validStatuses = ["active", "suspended", "deactivated"];
    if (!validStatuses.includes(props.body.status)) {
      throw new HttpException("Invalid status", 400);
    }
  }

  // Authorization: Check if requesting admin has permission to update this account
  if (props.admin.id !== props.administratorId) {
    // Only super_admins can update other administrators
    if (props.admin.role_level !== "super_admin") {
      throw new HttpException(
        "Insufficient permissions to update other administrators",
        403,
      );
    }

    // Super_admins can update anyone, but let's ensure reasonable permissions
    if (
      existing.role_level === "super_admin" &&
      props.body.role_level &&
      props.body.role_level !== "super_admin"
    ) {
      throw new HttpException("Cannot downgrade super_admin role", 403);
    }
  }

  // Build update data with only provided fields (partial update)
  const updateData: Prisma.todo_app_administratorsUpdateInput = {};

  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }

  if (props.body.first_name !== undefined) {
    updateData.first_name = props.body.first_name;
  }

  if (props.body.last_name !== undefined) {
    updateData.last_name = props.body.last_name;
  }

  if (props.body.role_level !== undefined) {
    updateData.role_level = props.body.role_level;
  }

  if (props.body.status !== undefined) {
    updateData.status = props.body.status;
  }

  // Always update the updated_at timestamp
  updateData.updated_at = new Date();

  // Perform the update
  const updated = await MyGlobal.prisma.todo_app_administrators.update({
    where: { id: props.administratorId },
    data: updateData,
  });

  // Return formatted response with proper date handling
  return {
    id: updated.id,
    email: updated.email,
    first_name: updated.first_name ?? undefined,
    last_name: updated.last_name ?? undefined,
    role_level: updated.role_level,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
