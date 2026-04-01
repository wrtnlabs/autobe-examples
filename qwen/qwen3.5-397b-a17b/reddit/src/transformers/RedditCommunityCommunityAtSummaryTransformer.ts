import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommunityIconAtSummaryTransformer } from "./RedditCommunityCommunityIconAtSummaryTransformer";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityCommunityAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        owner: RedditCommunityMemberAtSummaryTransformer.select(),
        _count: {
          select: {
            subscriptions: true,
          },
        },
        communityIcons:
          RedditCommunityCommunityIconAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      owner: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      subscriber_count: input._count.subscriptions,
      created_at: input.created_at.toISOString(),
      icon: input.communityIcons
        ? await RedditCommunityCommunityIconAtSummaryTransformer.transform(
            input.communityIcons,
          )
        : null,
    };
  }
}
