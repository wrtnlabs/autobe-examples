import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITOdoAppTodoDescriptionField } from "@ORGANIZATION/PROJECT-api/lib/structures/ITOdoAppTodoDescriptionField";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TOdoAppTodoDescriptionFieldTransformer {
  export type Payload = Prisma.todo_app_todo_description_fieldsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        description: true,
        created_at: true,
        updated_at: true,
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_todo_description_fieldsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITOdoAppTodoDescriptionField> {
    return {
      id: input.id,
      description: input.description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
    };
  }
}
