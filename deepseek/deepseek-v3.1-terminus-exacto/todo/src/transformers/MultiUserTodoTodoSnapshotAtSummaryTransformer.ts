import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodoSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoTodoSnapshotAtSummaryTransformer {
  export type Payload = Prisma.multi_user_todo_todo_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        is_completed: true,
        is_deleted: true,
        created_at: true,
      },
    } satisfies Prisma.multi_user_todo_todo_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoTodoSnapshot.ISummary> {
    return {
      id: input.id,
      title: input.title,
      is_completed: input.is_completed,
      is_deleted: input.is_deleted,
      created_at: input.created_at.toISOString(),
    };
  }
}
