import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoTransformer } from "./TodoAppTodoTransformer";
import { TodoAppUserAtSummaryTransformer } from "./TodoAppUserAtSummaryTransformer";

export namespace TodoAppTrashItemTransformer {
  export type Payload = Prisma.todo_app_trash_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        deleted_at: true,
        restored_at: true,
        permanently_deleted_at: true,
        created_at: true,
        updated_at: true,
        user: TodoAppUserAtSummaryTransformer.select(),
        todo: TodoAppTodoTransformer.select(),
      },
    } satisfies Prisma.todo_app_trash_itemsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppTrashItem> {
    return {
      id: input.id,
      deleted_at: toISOStringSafe(input.deleted_at),
      restored_at: input.restored_at
        ? toISOStringSafe(input.restored_at)
        : null,
      permanently_deleted_at: input.permanently_deleted_at
        ? toISOStringSafe(input.permanently_deleted_at)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      todo: await TodoAppTodoTransformer.transform(input.todo),
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
    };
  }
}
