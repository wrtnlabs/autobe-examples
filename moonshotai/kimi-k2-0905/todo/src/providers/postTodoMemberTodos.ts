import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postTodoMemberTodos(props: {
  member: MemberPayload;
  body: ITodoTodo.ITodoCreate;
}): Promise<ITodoTodo> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_todos.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: props.member.id,
      title: props.body.title,
      completed: false,
      priority: props.body.priority ?? "Medium",
      created_at: now,
      updated_at: now,
      completed_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    member_id: created.member_id as string & tags.Format<"uuid">,
    title: created.title,
    completed: created.completed,
    priority: created.priority as IETodoPriority,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at: null,
  };
}
