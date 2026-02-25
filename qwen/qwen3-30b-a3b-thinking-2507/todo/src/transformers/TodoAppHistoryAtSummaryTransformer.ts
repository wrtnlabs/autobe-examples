import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_app_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        timestamp: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        todo: true,
      },
    } satisfies Prisma.todo_app_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppHistory.ISummary> {
    return {
      id: input.id,
      timestamp: toISOStringSafe(input.timestamp),
      title: input.title,
      description: input.description,
      start_date: input.start_date ? toISOStringSafe(input.start_date) : null,
      due_date: input.due_date ? toISOStringSafe(input.due_date) : null,
    };
  }
}
