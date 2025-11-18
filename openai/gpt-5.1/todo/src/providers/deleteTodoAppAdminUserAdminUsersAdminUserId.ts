import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteTodoAppAdminUserAdminUsersAdminUserId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Prevent an admin from deleting their own account through this endpoint
  if (props.adminUser.id === props.adminUserId) {
    throw new HttpException("You cannot delete your own admin account.", 403);
  }

  // Locate the target admin user by ID
  const targetAdmin = await MyGlobal.prisma.todo_app_adminusers.findUnique({
    where: {
      id: props.adminUserId,
    },
  });

  if (targetAdmin === null) {
    throw new HttpException("Admin user not found.", 404);
  }

  // Check how many active (non-deleted) admins exist
  const activeAdminCount = await MyGlobal.prisma.todo_app_adminusers.count({
    where: {
      status: "active",
      deleted_at: null,
    },
  });

  // If this is the last remaining active admin, prevent deletion to
  // avoid leaving the system without any administrative account
  if (
    activeAdminCount === 1 &&
    targetAdmin.status === "active" &&
    targetAdmin.deleted_at === null
  ) {
    throw new HttpException(
      "Cannot delete the last remaining active admin user.",
      409,
    );
  }

  // Perform hard delete of the admin user record
  await MyGlobal.prisma.todo_app_adminusers.delete({
    where: {
      id: props.adminUserId,
    },
  });
}
