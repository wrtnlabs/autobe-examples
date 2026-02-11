import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformBanAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        expired_at: true,
        deleted_at: true,
        community: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
        bannedBy: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    } satisfies Prisma.reddit_platform_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at?.toISOString() ?? null,
      user: {
        id: input.user.id,
        username: input.user.username,
        displayName: input.user.display_name ?? undefined,
        avatarUrl: input.user.avatar_url ?? undefined,
      },
      bannedBy: {
        id: input.bannedBy.id,
        username: input.bannedBy.username,
        displayName: input.bannedBy.display_name ?? undefined,
        avatarUrl: input.bannedBy.avatar_url ?? undefined,
      },
    };
  }
}
