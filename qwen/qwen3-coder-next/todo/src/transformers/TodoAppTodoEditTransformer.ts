import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEdit";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoEditTransformer {
  // 1. Payload type first
  export type Payload = Prisma.todo_app_todo_editsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        todo_id: true,
        edited_at: true,
        previous_title: true,
        new_title: true,
        previous_description: true,
        new_description: true,
        previous_start_date: true,
        new_start_date: true,
        previous_due_date: true,
        new_due_date: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_app_todo_editsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(input: Payload): Promise<ITodoAppTodoEdit> {
    return {
      id: input.id,
      todo_id: input.todo_id,
      edited_at: input.edited_at.toISOString(),
      previous_title: input.previous_title ?? undefined,
      new_title: input.new_title ?? undefined,
      previous_description: input.previous_description ?? undefined,
      new_description: input.new_description ?? undefined,
      previous_start_date: input.previous_start_date
        ? input.previous_start_date.toISOString()
        : undefined,
      new_start_date: input.new_start_date
        ? input.new_start_date.toISOString()
        : undefined,
      previous_due_date: input.previous_due_date
        ? input.previous_due_date.toISOString()
        : undefined,
      new_due_date: input.new_due_date
        ? input.new_due_date.toISOString()
        : undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
