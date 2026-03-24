import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppGuestTransformer {
  export type Payload = Prisma.todo_app_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_identifier: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
      },
    } satisfies Prisma.todo_app_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppGuest> {
    return {
      id: input.id as ITodoAppGuest["id"],
      device_identifier: input.device_identifier,
      created_at: input.created_at.toISOString() as ITodoAppGuest["created_at"],
      updated_at: input.updated_at.toISOString() as ITodoAppGuest["updated_at"],
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
