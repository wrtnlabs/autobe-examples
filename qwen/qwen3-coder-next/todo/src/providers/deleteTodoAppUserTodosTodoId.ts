import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, todoId } = props;
} // Soft-delete todo by setting is_deleted=true and deleted_at=current timestamp await MyGlobal.prisma.todo_app_todos.update({ where: { id: todoId, todo_app_user_id: user.id }, data: { is_deleted: true, deleted_at: new Date().toISOString() as string & tags.Format<'date-time'> } }); const deleted = await MyGlobal.prisma.todo_app_todos.findUnique({ where: { id: todoId, todo_app_user_id: user.id } }); if (deleted === null || !deleted.is_deleted) { throw new HttpException('Todo not found or access denied', 404); } }
