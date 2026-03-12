import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoMemberTrashTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodo> {
  // Find the todo in trash and verify ownership
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      deleted: true,
      multi_user_todo_member_id: props.member.id,
    },
    select: {
      id: true,
    },
  });
  // Update the todo to restore it from trash
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: {
      deleted: false,
      deleted_at: null,
      updated_at: new Date(),
    },
  });
  // Fetch the restored todo with full data
  const restored =
    await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    });
  return await MultiUserTodoTodoTransformer.transform(restored);
}
