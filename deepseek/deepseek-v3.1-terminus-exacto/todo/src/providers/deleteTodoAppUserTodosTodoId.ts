import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Perform deletion with ownership verification in a single operation
  const result = await MyGlobal.prisma.todo_app_todos.deleteMany({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
    },
  });

  // Check if any records were actually deleted
  if (result.count === 0) {
    throw new HttpException(
      "Todo not found or you don't have permission to delete it",
      404,
    );
  }
}
