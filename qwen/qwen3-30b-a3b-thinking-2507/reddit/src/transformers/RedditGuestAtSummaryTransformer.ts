import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditGuestAtSummaryTransformer {
  export type Payload = Prisma.reddit_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {},
        } satisfies Prisma.reddit_guest_sessionsFindManyArgs,
      },
    } satisfies Prisma.reddit_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditGuest.ISummary> {
    return {
      id: input.id,
      device_id: input.device_id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
