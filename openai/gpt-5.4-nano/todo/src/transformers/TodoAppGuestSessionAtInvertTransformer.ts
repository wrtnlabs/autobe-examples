import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppGuestSessionAtInvertTransformer {
  export type Payload = Prisma.todo_app_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        guest: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.todo_app_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppGuestSession.IInvert> {
    return {
      id: input.id,
      guest: {},
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
