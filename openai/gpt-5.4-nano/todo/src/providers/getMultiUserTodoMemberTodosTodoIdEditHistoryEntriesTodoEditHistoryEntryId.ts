import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoEditHistoryEntryTransformer } from "../transformers/MultiUserTodoTodoEditHistoryEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberTodosTodoIdEditHistoryEntriesTodoEditHistoryEntryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  todoEditHistoryEntryId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoEditHistoryEntry> {
  await MyGlobal.prisma.multi_user_todo_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
    },
    select: { id: true },
  });
  const record =
    await MyGlobal.prisma.multi_user_todo_todo_edit_history_entries.findFirstOrThrow(
      {
        where: {
          id: props.todoEditHistoryEntryId,
          multi_user_todo_todo_id: props.todoId,
        },
        ...MultiUserTodoTodoEditHistoryEntryTransformer.select(),
      },
    );
  return await MultiUserTodoTodoEditHistoryEntryTransformer.transform(record);
}
