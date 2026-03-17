import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
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
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: RedditCommunityMemberAtSummaryTransformer.select(),
        subscriptions: true,
        moderators: true,
        bans: true,
        posts: true,
        reports: true,
        homeFeedCaches: true,
        icon: true,
        iconFiles: true,
        systemLogs: true,
      },
    } satisfies Prisma.reddit_community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      subscriber_count: input.subscriber_count,
      owner: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      icon_url: input.icon ? undefined : undefined,
    };
  }
}
