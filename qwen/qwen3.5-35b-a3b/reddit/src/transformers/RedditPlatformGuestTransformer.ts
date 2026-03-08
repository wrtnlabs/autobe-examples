import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformGuestTransformer {
  export type Payload = Prisma.reddit_platform_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            id: true,
            reddit_platform_guest_id: true,
            ip: true,
            referrer: true,
            href: true,
            created_at: true,
            expired_at: true,
          },
        } satisfies Prisma.reddit_platform_guest_sessionsFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformGuest> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio,
      avatar_url: input.avatar_url,
      karma: input.karma,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      sessions: await ArrayUtil.asyncMap(input.sessions, (session) =>
        Promise.resolve({
          id: session.id,
          reddit_platform_guest_id: session.reddit_platform_guest_id,
          ip: session.ip,
          referrer: session.referrer,
          href: session.href,
          created_at: toISOStringSafe(session.created_at),
          expired_at: toISOStringSafe(session.expired_at),
        }),
      ),
    };
  }
}
