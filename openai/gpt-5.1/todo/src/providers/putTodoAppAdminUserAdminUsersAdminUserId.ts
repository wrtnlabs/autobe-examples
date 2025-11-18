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
  // Step 1: locate existing admin user by primary key
  const existing = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      id: props.adminUserId,
    },
  });

  if (existing === null) {
    throw new HttpException("Admin user not found", 404);
  }

  // Determine which fields are present in the request body
  const hasEmail: boolean = Object.prototype.hasOwnProperty.call(
    props.body,
    "email",
  );
  const hasDisplayName: boolean = Object.prototype.hasOwnProperty.call(
    props.body,
    "display_name",
  );
  const hasStatus: boolean = Object.prototype.hasOwnProperty.call(
    props.body,
    "status",
  );

  // If no updatable fields are provided, return the existing record mapped to DTO
  if (!hasEmail && !hasDisplayName && !hasStatus) {
    return {
      id: existing.id,
      email: existing.email,
      display_name: existing.display_name,
      status: existing.status,
      created_at: toISOStringSafe(existing.created_at),
      updated_at: toISOStringSafe(existing.updated_at),
    };
  }

  // Step 2: enforce unique email when updating email
  if (hasEmail && props.body.email !== undefined) {
    const duplicate = await MyGlobal.prisma.todo_app_adminusers.findFirst({
      where: {
        email: props.body.email,
        NOT: {
          id: existing.id,
        },
      },
    });

    if (duplicate !== null) {
      throw new HttpException(
        "Email is already in use by another admin user",
        400,
      );
    }
  }

  // Step 3: perform the update
  const updated = await MyGlobal.prisma.todo_app_adminusers.update({
    where: {
      id: props.adminUserId,
    },
    data: {
      ...(hasEmail && props.body.email !== undefined
        ? { email: props.body.email }
        : {}),
      ...(hasDisplayName
        ? {
            display_name:
              props.body.display_name === undefined
                ? existing.display_name
                : props.body.display_name,
          }
        : {}),
      ...(hasStatus && props.body.status !== undefined
        ? { status: props.body.status }
        : {}),
      // Rely on database or Prisma middleware to manage updated_at automatically.
    },
  });

  // Step 4: map updated record to DTO, never exposing password_hash
  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
