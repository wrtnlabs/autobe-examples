import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { IRedditLikeGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeGuestAtSummaryTransformer } from "./RedditLikeGuestAtSummaryTransformer";

export namespace RedditLikeGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        redditLikeGuest: RedditLikeGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeGuestSession.ISummary> {
    return {
      id: input.id,
      reddit_like_guest: await RedditLikeGuestAtSummaryTransformer.transform(
        input.redditLikeGuest,
      ),
      ip: input.ip,
      href: input.href ?? null,
      referrer: input.referrer ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    } satisfies IRedditLikeGuestSession.ISummary;
  }
}
