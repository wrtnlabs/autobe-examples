import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeGuestTransformer {
  export type Payload = Prisma.reddit_like_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        device_id: true,
        created_at: true,
        updated_at: true,
        sessions: true,
      },
    } satisfies Prisma.reddit_like_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeGuest> {
    return {
      id: input.id,
      device_id: input.device_id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
