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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoAppMemberAtSummaryTransformer } from "../transformers/MultiUserTodoAppMemberAtSummaryTransformer";
import { MultiUserTodoAppTodoTransformer } from "../transformers/MultiUserTodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMultiUserTodoAppMemberTodosTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoAppTodo> {
  const todo =
    await MyGlobal.prisma.multi_user_todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      select: {
        id: true,
        user_id: true,
        deleted_at: true,
        user: MultiUserTodoAppMemberAtSummaryTransformer.select(),
      },
    });
  if (todo.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 404);
  }
  const restored = await MyGlobal.prisma.multi_user_todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: null,
    },
    ...MultiUserTodoAppTodoTransformer.select(),
  });
  return await MultiUserTodoAppTodoTransformer.transform(restored);
}
