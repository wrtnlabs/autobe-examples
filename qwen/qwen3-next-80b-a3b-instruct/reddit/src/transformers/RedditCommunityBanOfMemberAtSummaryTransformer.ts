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

export namespace RedditCommunityBanOfMemberAtSummaryTransformer {
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
  ): Promise<IRedditCommunityBanOfMember.ISummary> {
    const bannedActor =
      input.bannedMember !== null
        ? await RedditCommunityMemberAtSummaryTransformer.transform(
            input.bannedMember,
          )
        : input.bannedOwner !== null
          ? await RedditCommunityCommunityOwnerAtSummaryTransformer.transform(
              input.bannedOwner,
            )
          : input.bannedModerator !== null
            ? await RedditCommunityCommunityModeratorAtSummaryTransformer.transform(
                input.bannedModerator,
              )
            : null;
    return {
      id: input.id,
      reason: input.reason,
      created_at: toISOStringSafe(input.created_at),
      moderator:
        await RedditCommunityCommunityModeratorAtSummaryTransformer.transform(
          input.moderator,
        ),
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      banned_actor: bannedActor as
        | IRedditCommunityCommunityModerator.ISummary
        | IRedditCommunityCommunityOwner.ISummary
        | IRedditCommunityMember.ISummary,
    };
  }
}
