import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { TodoAppTodoCollector } from "../collectors/TodoAppTodoCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // Validate date relationship if both dates are provided
  if (props.body.startDate && props.body.dueDate) {
    const startDate = new Date(props.body.startDate);
    const dueDate = new Date(props.body.dueDate);
    if (startDate > dueDate) {
      throw new HttpException(
        "Start date must be before or equal to due date",
        400,
      );
    }
  }
  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: await TodoAppTodoCollector.collect({
      body: props.body,
      todoAppMembers: {
        id: props.member.id,
      } as Prisma.todo_app_membersGetPayload<{
        select: {
          id: true;
        };
      }>,
    }),
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(created);
}
