import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistoryEntryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistoryEntryChange";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MultiUserTodoEditHistoryEntryChangeCollector {
  export async function collect(props: {
    body: IMultiUserTodoEditHistoryEntryChange.ICreate;
    todoEditHistoryEntry: IEntity;
  }) {
    return {
      id: v4(),
      changed_field: props.body.changedField,
      from_value: props.body.fromValue,
      to_value: props.body.toValue,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      todoEditHistoryEntry: { connect: { id: props.todoEditHistoryEntry.id } },
    } satisfies Prisma.multi_user_todo_edit_history_entry_changesCreateInput;
  }
}
