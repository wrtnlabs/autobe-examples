import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformAdminAtSummaryTransformer } from "./RedditPlatformAdminAtSummaryTransformer";
import { RedditPlatformCommunityAtSummaryTransformer } from "./RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformBanTransformer {
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
        community: RedditPlatformCommunityAtSummaryTransformer.select(),
        user: RedditPlatformMemberAtSummaryTransformer.select(),
        bannedBy: RedditPlatformAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_bansFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditPlatformBan> {
    return {
      id: input.id,
      reason: input.reason,
      bannedAt: input.created_at.toISOString(),
      expiredAt: input.expired_at ? input.expired_at.toISOString() : null,
      community: await RedditPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      user: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.user,
      ),
      bannedBy: await RedditPlatformAdminAtSummaryTransformer.transform(
        input.bannedBy,
      ),
    };
  }
}
