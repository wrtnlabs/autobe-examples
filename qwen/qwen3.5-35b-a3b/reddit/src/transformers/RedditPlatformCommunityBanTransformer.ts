import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommunityBanTransformer {
  export type Payload = Prisma.reddit_platform_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expires_at: true,
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        bannedUser: RedditPlatformMemberAtSummaryTransformer.select(),
        bannedBy: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommunityBan> {
    const expiresAt = input.expires_at;
    const deletedAt = input.deleted_at;
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: deletedAt === null ? null : toISOStringSafe(deletedAt),
      expires_at: expiresAt === null ? null : toISOStringSafe(expiresAt),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      bannedUser: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      bannedBy: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      isActive:
        deletedAt === null && (expiresAt === null || expiresAt > new Date()),
      isPermanent: expiresAt === null,
      durationDays:
        expiresAt !== null
          ? Math.floor(
              (expiresAt.getTime() - input.created_at.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null,
    } satisfies IRedditPlatformCommunityBan;
  }
}
