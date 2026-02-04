import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoHistoryAtSummaryTransformer {
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
  export async function transform(
    input: Payload,
  ): Promise<ITodoHistory.ISummary> {
    let field_name = "unknown";
    if (input.previous_title !== null) {
      field_name = "title";
    } else if (input.previous_description !== null) {
      field_name = "description";
    } else if (input.previous_start_date !== null) {
      field_name = "start_date";
    } else if (input.previous_due_date !== null) {
      field_name = "due_date";
    }
    return {
      created_at: toISOStringSafe(input.created_at),
      field_name,
      previous_value: toISOStringSafe(
        field_name === "title"
          ? (input.previous_title as string | Date)
          : field_name === "description"
            ? (input.previous_description as string | Date)
            : field_name === "start_date"
              ? (input.previous_start_date as string | Date)
              : (input.previous_due_date as string | Date),
      ),
      new_value: toISOStringSafe(
        field_name === "title"
          ? (input.new_title as string | Date)
          : field_name === "description"
            ? (input.new_description as string | Date)
            : field_name === "start_date"
              ? (input.new_start_date as string | Date)
              : (input.new_due_date as string | Date),
      ),
    };
  }
}
