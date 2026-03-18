import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoEditHistoryEntryCollector {
  export async function collect(props: {
    body: IMultiUserTodoEditHistoryEntry.ICreate;
    multiUserTodos: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      edited_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      todo: {
        connect: { id: props.multiUserTodos.id },
      },
    } satisfies Prisma.multi_user_todo_edit_history_entriesCreateInput;
  }
}
