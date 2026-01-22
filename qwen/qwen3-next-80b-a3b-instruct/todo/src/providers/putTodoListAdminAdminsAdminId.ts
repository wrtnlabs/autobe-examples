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

export async function putTodoListAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: ITodoListAdmin.IUpdate;
}): Promise<ITodoListAdmin> {
  // Verify admin authorization: admin must match requested adminId
  if (props.admin.id !== props.adminId) {
    throw new HttpException(
      "Forbidden: You cannot update another admin's account",
      403,
    );
  }
  // Find the target admin record
  const existingAdmin = await MyGlobal.prisma.todo_list_admin.findUnique({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  // Validate that the admin account exists and is active
  if (!existingAdmin) {
    throw new HttpException("Admin account not found", 404);
  }
  // Update the email and set updated_at timestamp
  const updatedAdmin = await MyGlobal.prisma.todo_list_admin.update({
    where: {
      id: props.adminId,
    },
    data: {
      email: props.body.email,
      updated_at: toISOStringSafe(new Date()),
    },
    ...TodoListAdminTransformer.select(),
  });
  // Return transformed admin object
  return await TodoListAdminTransformer.transform(updatedAdmin);
}
