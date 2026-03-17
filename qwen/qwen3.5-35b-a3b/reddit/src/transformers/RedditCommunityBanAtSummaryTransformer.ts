import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityModeratorAtSummaryTransformer } from "./RedditCommunityModeratorAtSummaryTransformer";

export namespace RedditCommunityBanAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        banned_at: true,
        unbanned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        bannedMember: RedditCommunityMemberAtSummaryTransformer.select(),
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        bannedByModerator:
          RedditCommunityModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      bannedAt: input.banned_at.toISOString(),
      unbannedAt: input.unbanned_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      bannedMember: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      bannedByModerator:
        await RedditCommunityModeratorAtSummaryTransformer.transform(
          input.bannedByModerator,
        ),
    };
  }
}
