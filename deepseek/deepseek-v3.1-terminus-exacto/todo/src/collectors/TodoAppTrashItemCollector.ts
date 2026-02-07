import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppTrashItemCollector {
  export async function collect(props: {
    body: ITodoAppTrashItem.ICreate;
    todoAppUsers: IEntity; // from authorized actor
    todoAppUserSessions: IEntity; // from authorized session
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      deleted_at: new Date(),
      restored_at: null,
      permanently_deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      user: { connect: { id: props.todoAppUsers.id } },
      todo: { connect: { id: props.body.todo_app_todo_id } },
      // Reverse relations removed as they don't exist in CreateInput type
    } satisfies Prisma.todo_app_trash_itemsCreateInput;
  }
}
