import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { TodoListAdminTransformer } from "../transformers/TodoListAdminTransformer";

export async function deleteTodoListAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string;
}): Promise<ITodoListAdmin> {
  // Verify the target admin exists and is active (not deleted)
  const targetAdmin = await MyGlobal.prisma.todo_list_admin.findUnique({
    where: { id: props.adminId },
  });
  // If admin not found or already deleted, return 404
  if (!targetAdmin || targetAdmin.deleted_at !== null) {
    throw new HttpException("Admin not found", 404);
  }
  // Perform soft delete by setting deleted_at
  const deleted = await MyGlobal.prisma.todo_list_admin.update({
    where: { id: props.adminId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // Return the deleted entity using the existing transformer
  return TodoListAdminTransformer.transform(deleted);
}
