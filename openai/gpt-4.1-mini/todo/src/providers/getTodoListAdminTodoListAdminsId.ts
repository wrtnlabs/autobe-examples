import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminTodoListAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListAdmin> {
  const adminRecord = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.id },
  });

  if (!adminRecord || adminRecord.deleted_at !== null) {
    throw new HttpException("Admin not found", 404);
  }

  return {
    id: adminRecord.id,
    email: adminRecord.email,
    created_at: toISOStringSafe(adminRecord.created_at),
    updated_at: toISOStringSafe(adminRecord.updated_at),
    deleted_at:
      adminRecord.deleted_at === null
        ? null
        : toISOStringSafe(adminRecord.deleted_at),
  };
}
