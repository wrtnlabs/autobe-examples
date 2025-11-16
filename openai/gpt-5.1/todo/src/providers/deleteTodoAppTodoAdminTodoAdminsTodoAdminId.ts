import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function deleteTodoAppTodoAdminTodoAdminsTodoAdminId(props: {
  todoAdmin: TodoadminPayload;
  todoAdminId: string;
}): Promise<void> {
  // Find the target administrator by primary key.
  const existing = await MyGlobal.prisma.todo_app_todoadmins.findUnique({
    where: {
      id: props.todoAdminId,
    },
  });

  // If the administrator does not exist, return a clear not-found error.
  if (existing === null) {
    throw new HttpException("Todo administrator not found", 404);
  }

  // NOTE ON BUSINESS RULES:
  // ------------------------
  // The specification mentions optional rules such as preventing self-deletion
  // or enforcing "at least one administrator must remain". However, the
  // provided test scenarios treat both self-deletion and sole-admin deletion as
  // happy paths that must complete without server-side errors. Therefore, this
  // implementation intentionally allows deletion of any administrator record,
  // including the caller and the last remaining admin.
  //
  // If stricter policies are desired in the future, additional checks can be
  // added here to count remaining admins or to block self-deletion.

  // Perform permanent deletion of the administrator record.
  await MyGlobal.prisma.todo_app_todoadmins.delete({
    where: {
      id: props.todoAdminId,
    },
  });

  // No return value is required; successful completion implies deletion.
}
