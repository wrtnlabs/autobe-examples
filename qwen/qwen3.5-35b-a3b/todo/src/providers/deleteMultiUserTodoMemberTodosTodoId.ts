import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify todo exists and belongs to member, check it's not already deleted
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
      is_deleted: false,
    },
  });
  // Soft delete: set is_deleted=true and deleted_at to current timestamp
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: todo.id },
    data: {
      is_deleted: true,
      deleted_at: new Date(),
    },
  });
}
