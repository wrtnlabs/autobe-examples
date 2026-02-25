import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";
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
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_trash_itemsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppTrashItem> {
    return {
      id: input.id,
      deleted_at: input.deleted_at.toISOString(),
      restored_at: input.restored_at?.toISOString() ?? null,
      permanently_deleted_at:
        input.permanently_deleted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      user: await TodoAppUserAtSummaryTransformer.transform(input.user),
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
    };
  }
}
