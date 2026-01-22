import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoListGuestAtSummaryTransformer {
  export type Payload = Prisma.todo_list_guestGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_list_guestFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoListGuest.ISummary> {
    return {
      id: input.id,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
