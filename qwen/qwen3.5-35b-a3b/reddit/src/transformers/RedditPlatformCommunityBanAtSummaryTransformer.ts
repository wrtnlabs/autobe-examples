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

export namespace RedditPlatformCommunityBanAtSummaryTransformer {
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
  ): Promise<IRedditPlatformCommunityBan.ISummary> {
    const now = new Date();
    const isActive =
      input.deleted_at === null &&
      (input.expires_at === null || input.expires_at > now);
    return {
      id: input.id,
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      bannedBy: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      createdAt: input.created_at.toISOString(),
      expiresAt: input.expires_at?.toISOString() ?? null,
      deletedAt: input.deleted_at?.toISOString() ?? null,
      isActive,
    };
  }
}
