import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoTrashItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TodoAppTodoTrashItemTransformer {
  export type Payload = Prisma.todo_app_todo_trash_entriesGetPayload<
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
        todo: TodoAppTodoAtSummaryTransformer.select(),
        member: TodoAppMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_trash_entriesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoTrashItem> {
    return {
      id: input.id,
      deleted_at: input.deleted_at.toISOString(),
      restored_at: input.restored_at?.toISOString() ?? null,
      permanently_deleted_at:
        input.permanently_deleted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
