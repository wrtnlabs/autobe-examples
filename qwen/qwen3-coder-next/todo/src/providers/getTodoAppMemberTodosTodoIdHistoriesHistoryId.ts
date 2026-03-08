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

export async function getTodoAppMemberTodosTodoIdHistoriesHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<ITodoAppEditHistoryEntry> {
  const history = await MyGlobal.prisma.todo_app_edit_history_entries.findFirst(
    {
      where: {
        id: props.historyId,
        edit: {
          todo: {
            id: props.todoId,
            user: {
              id: props.member.id,
            },
          },
        },
      },
      ...TodoAppEditHistoryEntryTransformer.select(),
    },
  );
  if (history === null) {
    throw new HttpException("Not Found", 404);
  }
  return await TodoAppEditHistoryEntryTransformer.transform(history);
}
