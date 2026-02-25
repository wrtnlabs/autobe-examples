import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { IRedditGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditGuestAtSummaryTransformer } from "./RedditGuestAtSummaryTransformer";

export namespace RedditGuestSessionTransformer {
  export type Payload = Prisma.reddit_guest_sessionsGetPayload<
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
        expired_at: true,
        guest: RedditGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditGuestSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      guest: await RedditGuestAtSummaryTransformer.transform(input.guest),
    };
  }
}
