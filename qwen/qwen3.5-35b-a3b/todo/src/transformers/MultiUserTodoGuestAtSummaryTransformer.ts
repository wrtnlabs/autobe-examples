import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MultiUserTodoGuestAtSummaryTransformer {
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
        sessions: true,
      },
    } satisfies Prisma.multi_user_todo_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMultiUserTodoGuest.ISummary> {
    return {
      id: input.id,
      fingerprint_hash: input.fingerprint_hash.substring(0, 8),
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IMultiUserTodoGuest.ISummary;
  }
}
