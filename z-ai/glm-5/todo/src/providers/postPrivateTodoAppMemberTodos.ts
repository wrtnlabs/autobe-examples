import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PrivateTodoAppTodoCollector } from "../collectors/PrivateTodoAppTodoCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PrivateTodoAppTodoTransformer } from "../transformers/PrivateTodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postPrivateTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: IPrivateTodoAppTodo.ICreate;
}): Promise<IPrivateTodoAppTodo> {
  const created = await MyGlobal.prisma.private_todo_app_todos.create({
    data: await PrivateTodoAppTodoCollector.collect({
      body: props.body,
      privateTodoAppMembers: { id: props.member.id },
      privateTodoAppMemberSessions: { id: props.member.session_id },
    }),
    ...PrivateTodoAppTodoTransformer.select(),
  });
  return await PrivateTodoAppTodoTransformer.transform(created);
}
