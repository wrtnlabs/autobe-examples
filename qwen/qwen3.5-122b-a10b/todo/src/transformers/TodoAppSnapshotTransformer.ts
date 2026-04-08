import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSnapshot";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppTodoAtSummaryTransformer } from "./TodoAppTodoAtSummaryTransformer";

export namespace TodoAppSnapshotTransformer {
  export type Payload = Prisma.todo_app_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        is_completed: true,
        created_at: true,
        todo: TodoAppTodoAtSummaryTransformer.select(),
      },
    } satisfies Prisma.todo_app_snapshotsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppSnapshot> {
    return {
      id: input.id,
      todo: await TodoAppTodoAtSummaryTransformer.transform(input.todo),
      title: input.title,
      description: input.description,
      start_date: input.start_date?.toISOString() ?? null,
      due_date: input.due_date?.toISOString() ?? null,
      is_completed: input.is_completed,
      created_at: input.created_at.toISOString(),
    } satisfies ITodoAppSnapshot;
  }
}
