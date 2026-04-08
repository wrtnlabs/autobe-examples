import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppGuestAtSummaryTransformer {
  export type Payload = Prisma.todo_app_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_fingerprint: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            todoAppGuestSessions: true,
          },
        },
      },
    } satisfies Prisma.todo_app_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppGuest.ISummary> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      session_count: input._count.todoAppGuestSessions,
    } satisfies ITodoAppGuest.ISummary;
  }
}
