import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneCommunityAtSummaryTransformer } from "./RedditCloneCommunityAtSummaryTransformer";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";
import { RedditCloneModeratorAtSummaryTransformer } from "./RedditCloneModeratorAtSummaryTransformer";

export namespace RedditCloneCommunityBanTransformer {
  export type Payload = Prisma.reddit_clone_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ban_reason: true,
        ban_start_date: true,
        ban_end_date: true,
        appeal_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: RedditCloneCommunityAtSummaryTransformer.select(),
        user: RedditCloneMemberAtSummaryTransformer.select(),
        moderator: RedditCloneModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityBan> {
    return {
      id: input.id,
      community: await RedditCloneCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      user: await RedditCloneMemberAtSummaryTransformer.transform(input.user),
      moderator: await RedditCloneModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      banReason: input.ban_reason,
      banStartDate: input.ban_start_date.toISOString(),
      banEndDate: input.ban_end_date?.toISOString() ?? undefined,
      appealStatus: input.appeal_status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? undefined,
    };
  }
}
