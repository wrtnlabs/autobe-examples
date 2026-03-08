import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppMemberAtSummaryTransformer } from "./TodoAppMemberAtSummaryTransformer";

export namespace TodoAppEditHistoryAtSummaryTransformer {
  export type Payload = Prisma.todo_app_edit_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        todo: true,
        member: TodoAppMemberAtSummaryTransformer.select(),
        previous_title: true,
        new_title: true,
        previous_description: true,
        new_description: true,
        previous_start_date: true,
        new_start_date: true,
        previous_due_date: true,
        new_due_date: true,
      },
    } satisfies Prisma.todo_app_edit_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppEditHistory.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      member: await TodoAppMemberAtSummaryTransformer.transform(input.member),
      previous_title: input.previous_title ?? undefined,
      new_title: input.new_title ?? undefined,
      previous_description: input.previous_description ?? undefined,
      new_description: input.new_description ?? undefined,
      previous_start_date:
        input.previous_start_date?.toISOString() ?? undefined,
      new_start_date: input.new_start_date?.toISOString() ?? undefined,
      previous_due_date: input.previous_due_date?.toISOString() ?? undefined,
      new_due_date: input.new_due_date?.toISOString() ?? undefined,
    };
  }
}
