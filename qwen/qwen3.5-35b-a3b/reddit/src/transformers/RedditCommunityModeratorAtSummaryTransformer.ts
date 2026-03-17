import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export namespace RedditCommunityModeratorAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: RedditCommunityCommunityAtSummaryTransformer.select(),
        moderator: RedditCommunityMemberAtSummaryTransformer.select(),
        addedBy: RedditCommunityMemberAtSummaryTransformer.select(),
        issuedBans: true,
        moderationActions: true,
      },
    } satisfies Prisma.reddit_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityModerator.ISummary> {
    return {
      id: input.id,
      community: await RedditCommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      moderator: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.moderator,
      ),
      addedBy: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.addedBy,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
