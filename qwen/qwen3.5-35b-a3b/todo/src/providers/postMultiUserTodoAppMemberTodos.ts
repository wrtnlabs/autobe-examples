import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoAppTodoCollector } from "../collectors/MultiUserTodoAppTodoCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoAppTodoTransformer } from "../transformers/MultiUserTodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: IMultiUserTodoAppTodo.ICreate;
}): Promise<IMultiUserTodoAppTodo> {
  const member =
    await MyGlobal.prisma.multi_user_todo_app_members.findUniqueOrThrow({
      where: { id: props.member.id },
    });
  const created = await MyGlobal.prisma.multi_user_todo_app_todos.create({
    data: await MultiUserTodoAppTodoCollector.collect({
      body: props.body,
      multiUserTodoAppMembers: member,
      multiUserTodoAppMemberSessions: { id: props.member.session_id } as any,
    }),
    ...MultiUserTodoAppTodoTransformer.select(),
  });
  await MyGlobal.prisma.multi_user_todo_app_todo_edit_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo: { connect: { id: created.id } },
      user: { connect: { id: props.member.id } },
      edited_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      old_title: null,
      new_title: props.body.title,
      old_description: null,
      new_description: props.body.description ?? null,
      old_start_date: null,
      new_start_date: props.body.startDate ?? null,
      old_due_date: null,
      new_due_date: props.body.dueDate ?? null,
    },
  });
  return await MultiUserTodoAppTodoTransformer.transform(created);
}
