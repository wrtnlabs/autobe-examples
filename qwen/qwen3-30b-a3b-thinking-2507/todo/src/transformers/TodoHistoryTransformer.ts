import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoHistoryTransformer {
  export type Payload = Prisma.todo_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
        deleted_at: true,
        todo: true,
      },
    } satisfies Prisma.todo_historiesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoHistory> {
    return {
      id: input.id,
      titleBefore: input.previous_title ?? "",
      titleAfter: input.new_title,
      descriptionBefore: input.previous_description ?? "",
      descriptionAfter: input.new_description,
      startDateBefore: input.previous_start_date
        ? toISOStringSafe(input.previous_start_date)
        : "",
      startDateAfter: input.new_start_date
        ? toISOStringSafe(input.new_start_date)
        : "",
      dueDateBefore: input.previous_due_date
        ? toISOStringSafe(input.previous_due_date)
        : "",
      dueDateAfter: input.new_due_date
        ? toISOStringSafe(input.new_due_date)
        : "",
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
