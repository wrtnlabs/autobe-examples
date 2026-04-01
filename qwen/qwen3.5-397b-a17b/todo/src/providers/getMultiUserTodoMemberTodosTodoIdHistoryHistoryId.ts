import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoEditHistoryTransformer } from "../transformers/MultiUserTodoTodoEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdHistoryHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoEditHistory> {
  await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
      deleted_at: null,
    },
  });
  const history =
    await MyGlobal.prisma.multi_user_todo_todo_edit_histories.findUniqueOrThrow(
      {
        where: {
          id: props.historyId,
        },
        ...MultiUserTodoTodoEditHistoryTransformer.select(),
      },
    );
  return await MultiUserTodoTodoEditHistoryTransformer.transform(history);
}
