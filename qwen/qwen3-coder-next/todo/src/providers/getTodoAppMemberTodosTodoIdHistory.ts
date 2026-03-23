import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppEditHistoryEntryTransformer } from "../transformers/TodoAppEditHistoryEntryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodosTodoIdHistory(props: {
  member: MemberPayload;
  todoId: string;
}): Promise<ITodoAppEditHistoryEntry | null> {
  const history = await MyGlobal.prisma.todo_app_edit_history_entries.findMany({
    where: {
      edit: {
        todo_id: props.todoId,
      },
    },
    orderBy: { created_at: "desc" },
    ...TodoAppEditHistoryEntryTransformer.select(),
  });
  const entry = history[0];
  if (!entry) {
    return null;
  }
  return await TodoAppEditHistoryEntryTransformer.transform(entry);
}
