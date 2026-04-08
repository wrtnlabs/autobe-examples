import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneGuestSessionTransformer } from "./RedditCloneGuestSessionTransformer";

export namespace RedditCloneGuestTransformer {
  export type Payload = Prisma.reddit_clone_guestsGetPayload<
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
        sessions: RedditCloneGuestSessionTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_guestsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCloneGuest> {
    return {
      id: input.id,
      device_fingerprint: input.device_fingerprint,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      sessions: await ArrayUtil.asyncMap(
        input.sessions,
        RedditCloneGuestSessionTransformer.transform,
      ),
    };
  }
}
