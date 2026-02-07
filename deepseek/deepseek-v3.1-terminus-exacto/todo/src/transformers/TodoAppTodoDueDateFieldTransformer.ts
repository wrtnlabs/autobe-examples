import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodoDueDateField } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoDueDateField";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTodoDueDateFieldTransformer {
  export type Payload = Prisma.todo_app_todo_due_date_fieldsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        due_date: true,
        todo: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_todo_due_date_fieldsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTodoDueDateField> {
    return {
      id: input.id,
      due_date: input.due_date?.toISOString() ?? null,
      todo_app_todo_id: input.todo.id,
    };
  }
}
