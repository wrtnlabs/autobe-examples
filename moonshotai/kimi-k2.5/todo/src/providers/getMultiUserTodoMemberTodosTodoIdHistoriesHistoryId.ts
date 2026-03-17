import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoHistory";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoHistoryTransformer } from "../transformers/MultiUserTodoHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdHistoriesHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoHistory> {
  // Verify todo exists and belongs to the authenticated member
  await MyGlobal.prisma.multi_user_todo_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  // Fetch the history entry belonging to this todo
  const history =
    await MyGlobal.prisma.multi_user_todo_histories.findFirstOrThrow({
      where: {
        id: props.historyId,
        todo_id: props.todoId,
      },
      ...MultiUserTodoHistoryTransformer.select(),
    });
  return await MultiUserTodoHistoryTransformer.transform(history);
}
