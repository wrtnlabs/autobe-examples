import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppEditHistoryTransformer } from "../transformers/TodoAppEditHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdHistoryHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<ITodoAppEditHistory> {
  const history =
    await MyGlobal.prisma.todo_app_edit_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      ...TodoAppEditHistoryTransformer.select(),
    });
  if (history.todo.id !== props.todoId) {
    throw new HttpException("Not Found", 404);
  }
  if (history.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await TodoAppEditHistoryTransformer.transform(history);
}
