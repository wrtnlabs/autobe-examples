import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformGuestSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        referrer: true,
        href: true,
        created_at: true,
        expired_at: true,
        guest: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_platform_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformGuestSession.ISummary> {
    return {
      id: input.id,
      reddit_platform_guest_id: input.guest.id,
      href: input.href,
      referrer: input.referrer ?? null,
      ip: input.ip,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
    };
  }
}
