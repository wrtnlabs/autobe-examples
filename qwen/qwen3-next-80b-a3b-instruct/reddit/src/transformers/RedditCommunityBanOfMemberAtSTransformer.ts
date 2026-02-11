import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityModeratorAtSummaryTransformer } from "./RedditCommunityCommunityModeratorAtSummaryTransformer";
import { RedditCommunityCommunityOwnerAtSummaryTransformer } from "./RedditCommunityCommunityOwnerAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityBanOfMemberAtSTransformer {
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
        community: { select: { id: true, name: true } },
        moderator: RedditCommunityCommunityOwnerAtSummaryTransformer.select(),
        bannedMember: RedditCommunityMemberAtSummaryTransformer.select(),
        bannedOwner: RedditCommunityCommunityOwnerAtSummaryTransformer.select(),
        bannedModerator:
          RedditCommunityCommunityModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityBanOfMember.IS> {
    let bannedUser:
      | IRedditCommunityCommunityModerator.ISummary
      | IRedditCommunityCommunityOwner.ISummary
      | IRedditCommunityMember.ISummary
      | null = null;
    if (input.bannedMember) {
      bannedUser = await RedditCommunityMemberAtSummaryTransformer.transform(
        input.bannedMember,
      );
    } else if (input.bannedOwner) {
      bannedUser =
        await RedditCommunityCommunityOwnerAtSummaryTransformer.transform(
          input.bannedOwner,
        );
    } else if (input.bannedModerator) {
      bannedUser =
        await RedditCommunityCommunityModeratorAtSummaryTransformer.transform(
          input.bannedModerator,
        );
    }
    // Ensure the variable is of the correct type without null using type guard
    if (bannedUser === null) {
      throw new Error(
        "bannedUser must be one of bannedMember, bannedOwner, or bannedModerator",
      );
    }
    const moderator =
      await RedditCommunityCommunityOwnerAtSummaryTransformer.transform(
        input.moderator,
      );
    return {
      id: input.id,
      reason: input.reason,
      bannedUser,
      moderator,
    };
  }
}
