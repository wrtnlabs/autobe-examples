import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserDeletionLog";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminUsersUserIdDeletionLogsDeletionLogId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  deletionLogId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserDeletionLog> {
  // Find the deletion log (no invalid include)
  const log = await MyGlobal.prisma.todo_list_user_deletion_logs.findFirst({
    where: {
      id: props.deletionLogId,
      user_id: props.userId,
    },
  });

  if (!log) {
    throw new HttpException(
      "User deletion log not found for the specified userId and deletionLogId.",
      404,
    );
  }

  // Fetch user summary
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: log.user_id },
    select: { id: true, email: true, locked: true },
  });
  if (!user) {
    throw new HttpException("Deleted user not found for log entry.", 500);
  }

  // Fetch admin summary if present
  let deletedByAdmin: ITodoListAdmin.ISummary | null | undefined = undefined;
  if (log.deleted_by_admin_id !== null) {
    const admin = await MyGlobal.prisma.todo_list_admins.findUnique({
      where: { id: log.deleted_by_admin_id },
      select: {
        id: true,
        email: true,
        locked: true,
        role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    if (admin) {
      deletedByAdmin = {
        id: admin.id,
        email: admin.email,
        locked: admin.locked,
        role: admin.role,
        created_at: toISOStringSafe(admin.created_at),
        updated_at: toISOStringSafe(admin.updated_at),
        deleted_at:
          admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
      };
    } else {
      deletedByAdmin = null;
    }
  }

  return {
    id: log.id,
    user: {
      id: user.id,
      email: user.email,
      locked: user.locked,
    },
    deleted_by_admin: deletedByAdmin,
    reason: log.reason,
    deleted_at: toISOStringSafe(log.deleted_at),
  };
}
