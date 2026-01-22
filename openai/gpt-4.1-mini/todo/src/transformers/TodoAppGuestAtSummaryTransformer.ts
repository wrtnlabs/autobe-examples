import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppGuestAtSummaryTransformer {
  export type Payload = Prisma.todo_app_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        guest_identifier: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_app_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppGuest.ISummary> {
    return {
      id: input.id,
      guest_identifier: input.guest_identifier,
      created_at: (input.created_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(input.created_at)) satisfies string &
        tags.Format<"date-time">,
      updated_at: (input.updated_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(input.updated_at)) satisfies string &
        tags.Format<"date-time">,
      deleted_at: (input.deleted_at === null
        ? "1970-01-01T00:00:00.000Z"
        : toISOStringSafe(input.deleted_at)) satisfies string &
        tags.Format<"date-time">,
    };
  }
}
