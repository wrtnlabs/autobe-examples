import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoTodoCollector } from "../collectors/MultiUserTodoTodoCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoMemberTodos(props: {
  member: MemberPayload;
  body: IMultiUserTodoTodo.ICreate;
}): Promise<IMultiUserTodoTodo> {
  const title = props.body.title;
  if (title.trim().length === 0) {
    throw new HttpException("title is required", 400);
  }
  const profile = await MyGlobal.prisma.multi_user_todo_user_profiles.findFirst(
    {
      where: { id: props.member.id, deleted_at: null },
      select: { id: true },
    },
  );
  if (profile === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const collected = await MultiUserTodoTodoCollector.collect({
    body: props.body,
  });
  const record = await MyGlobal.prisma.multi_user_todo_todos.create({
    data: {
      ...collected,
      is_complete: false,
      lifecycle_state: "normal",
      deleted_at: null,
    },
    ...MultiUserTodoTodoTransformer.select(),
  });
  return await MultiUserTodoTodoTransformer.transform(record);
}
