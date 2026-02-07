import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        prev_title: true,
        new_title: true,
        prev_description: true,
        new_description: true,
        prev_start_date: true,
        new_start_date: true,
        prev_due_date: true,
        new_due_date: true,
        todo: true,
      },
    } satisfies Prisma.todo_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoHistory.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      prev_title: input.prev_title,
      new_title: input.new_title,
      prev_description: input.prev_description,
      new_description: input.new_description,
      prev_start_date: input.prev_start_date?.toISOString() ?? null,
      new_start_date: input.new_start_date?.toISOString() ?? null,
      prev_due_date: input.prev_due_date?.toISOString() ?? null,
      new_due_date: input.new_due_date?.toISOString() ?? null,
    };
  }
}
