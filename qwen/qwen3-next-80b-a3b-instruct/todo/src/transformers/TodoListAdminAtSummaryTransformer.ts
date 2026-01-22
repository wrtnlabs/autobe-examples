import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoListAdminAtSummaryTransformer {
  export type Payload = Prisma.todo_list_adminGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        email: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_list_adminFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoListAdmin.ISummary> {
    return {
      email: input.email,
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
