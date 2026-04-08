import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoGuestTransformer {
  export type Payload = Prisma.multi_user_todo_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        fingerprint_hash: true,
        user_agent: true,
        ip_address: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.multi_user_todo_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoGuest> {
    return {
      id: input.id,
      fingerprint_hash: input.fingerprint_hash,
      user_agent: input.user_agent ?? undefined,
      ip_address: input.ip_address ?? undefined,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      sessions_count: input.sessions.length,
    } satisfies IMultiUserTodoGuest;
  }
}
