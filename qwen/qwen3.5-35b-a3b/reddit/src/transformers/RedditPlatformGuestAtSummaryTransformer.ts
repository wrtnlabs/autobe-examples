import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformGuestAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_guestsGetPayload<{
    select: {
      id: true;
      email: true;
      password_hash: true;
      username: true;
      display_name: true;
      bio: true;
      avatar_url: true;
      karma: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      sessions: true;
    };
  }>;
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
        sessions: true,
      },
    } satisfies Prisma.reddit_platform_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformGuest.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio,
      avatar_url: input.avatar_url,
      karma: input.karma,
      posts_count: 0,
      comments_count: 0,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
