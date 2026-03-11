import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoTrashEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoTrashEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MultiUserTodoTodoAtSummaryTransformer } from "./MultiUserTodoTodoAtSummaryTransformer";

export namespace MultiUserTodoTodoTrashEntryTransformer {
  export type Payload = Prisma.multi_user_todo_todo_trash_entriesGetPayload<
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
        todo: MultiUserTodoTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.multi_user_todo_todo_trash_entriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoTrashEntry> {
    return {
      id: input.id,
      deleted_at: input.deleted_at.toISOString(),
      restored_at: input.restored_at?.toISOString() ?? null,
      permanently_deleted_at:
        input.permanently_deleted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      todo: await MultiUserTodoTodoAtSummaryTransformer.transform(input.todo),
    };
  }
}
