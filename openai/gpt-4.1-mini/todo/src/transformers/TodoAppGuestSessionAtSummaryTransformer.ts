import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.todo_app_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        guest_id: true,
        created_at: true,
        href: true,
        referrer: true,
        ip: true,
        expired_at: true,
      },
    } satisfies Prisma.todo_app_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppGuestSession.ISummary> {
    return {
      id: input.id,
      guest_id: input.guest_id,
      created_at: toISOStringSafe(input.created_at),
      href: input.href ?? null,
      referrer: input.referrer ?? null,
      ip: input.ip ?? null,
      expired_at: toISOStringSafe(input.expired_at) ?? null,
    };
  }
}
