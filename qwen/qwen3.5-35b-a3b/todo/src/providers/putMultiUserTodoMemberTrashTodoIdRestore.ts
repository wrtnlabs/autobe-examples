import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      is_deleted: true,
      multi_user_todo_member_id: props.member.id,
    },
  });
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: {
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow(
    {
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    },
  );
  return await MultiUserTodoTodoTransformer.transform(updated);
}
