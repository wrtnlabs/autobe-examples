import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoAppAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUser.IUpdate;
}): Promise<ITodoAppUser> {
  const { admin, userId, body } = props;

  // Ensure target exists
  const existing = await MyGlobal.prisma.todo_app_user.findUnique({
    where: { id: userId },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new HttpException("Not Found", 404);
  }

  try {
    // Perform update (only include display_name if provided)
    const updated = await MyGlobal.prisma.todo_app_user.update({
      where: { id: userId },
      data: {
        ...(body.display_name !== undefined && {
          display_name: body.display_name,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        account_status: true,
        created_at: true,
        updated_at: true,
        last_active_at: true,
      },
    });

    // Create audit record for this admin action
    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: v4(),
        admin_id: admin.id,
        user_id: userId,
        actor_role: "admin",
        action_type: "update_user",
        target_resource: "todo_app_user",
        target_id: userId,
        created_at: toISOStringSafe(new Date()),
      },
    });

    // Map Prisma Date objects to ISO strings for API response
    return {
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name ?? null,
      account_status: updated.account_status,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      last_active_at: updated.last_active_at
        ? toISOStringSafe(updated.last_active_at)
        : null,
    };
  } catch (err) {
    // Prisma not found in update would have been caught earlier. For other errors, return 500.
    throw new HttpException("Internal Server Error", 500);
  }
}
