import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putTodoAppAdminUserAdminUsersAdminUserId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
  body: ITodoAppAdminUser.IUpdate;
}): Promise<ITodoAppAdminUser> {
  // Ensure target admin user exists and is not logically deleted
  const existing = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      id: props.adminUserId,
      deleted_at: null,
    },
  });

  if (existing === null) {
    throw new HttpException("Admin user not found", 404);
  }

  const body = props.body;

  // Build update payload from provided fields only
  const data = {
    ...(body.email !== undefined && { email: body.email }),
    ...(body.display_name !== undefined && { display_name: body.display_name }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.failed_login_count !== undefined && {
      failed_login_count: body.failed_login_count,
    }),
    ...(body.last_login_at !== undefined && {
      last_login_at:
        body.last_login_at === null
          ? null
          : toISOStringSafe(body.last_login_at),
    }),
    ...(body.deleted_at !== undefined && {
      deleted_at:
        body.deleted_at === null ? null : toISOStringSafe(body.deleted_at),
    }),
  };

  try {
    const updated = await MyGlobal.prisma.todo_app_adminusers.update({
      where: { id: props.adminUserId },
      data,
    });

    // Basic runtime consistency checks for required timestamp fields
    if (updated.created_at === null || updated.created_at === undefined) {
      throw new HttpException(
        "Invalid admin user data: created_at is missing",
        500,
      );
    }
    if (updated.updated_at === null || updated.updated_at === undefined) {
      throw new HttpException(
        "Invalid admin user data: updated_at is missing",
        500,
      );
    }

    // Map database record to API DTO
    const result: ITodoAppAdminUser = {
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name === null ? null : updated.display_name,
      status: updated.status,
      failed_login_count: updated.failed_login_count,
      last_login_at:
        updated.last_login_at === null || updated.last_login_at === undefined
          ? null
          : toISOStringSafe(updated.last_login_at),
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null || updated.deleted_at === undefined
          ? null
          : toISOStringSafe(updated.deleted_at),
    };

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // Unique constraint failed, likely on email
        throw new HttpException("Email is already in use", 409);
      }
    }
    throw error;
  }
}
