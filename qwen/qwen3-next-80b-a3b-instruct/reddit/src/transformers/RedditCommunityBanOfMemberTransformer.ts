import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityAtSummaryTransformer } from "./RedditCommunityCommunityAtSummaryTransformer";
import { RedditCommunityCommunityModeratorAtSummaryTransformer } from "./RedditCommunityCommunityModeratorAtSummaryTransformer";
import { RedditCommunityCommunityOwnerAtSummaryTransformer } from "./RedditCommunityCommunityOwnerAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityBanOfMemberTransformer {
  export type Payload = Prisma.reddit_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        moderator:
          RedditCommunityCommunityModeratorAtSummaryTransformer.select(),
        bannedMember: RedditCommunityMemberAtSummaryTransformer.select(),
        bannedOwner: RedditCommunityCommunityOwnerAtSummaryTransformer.select(),
        bannedModerator:
          RedditCommunityCommunityModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityBanOfMember> {
    return {
      id: input.id,
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      moderator:
        await RedditCommunityCommunityModeratorAtSummaryTransformer.transform(
          input.moderator,
        ),
      bannedMember: input.bannedMember
        ? await RedditCommunityMemberAtSummaryTransformer.transform(
            input.bannedMember,
          )
        : null,
      bannedOwner: input.bannedOwner
        ? await RedditCommunityCommunityOwnerAtSummaryTransformer.transform(
            input.bannedOwner,
          )
        : null,
      bannedModerator: input.bannedModerator
        ? await RedditCommunityCommunityModeratorAtSummaryTransformer.transform(
            input.bannedModerator,
          )
        : null,
      reason: input.reason,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at !== null && input.deleted_at !== undefined
          ? toISOStringSafe(input.deleted_at)
          : null,
    };
  }
}
