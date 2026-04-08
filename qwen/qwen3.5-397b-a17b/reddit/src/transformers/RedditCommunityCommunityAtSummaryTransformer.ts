import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        icon: true,
        created_at: true,
        owner: RedditCommunityMemberAtSummaryTransformer.select(),
        _count: {
          select: {
            subscriptions: true,
          },
        },
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
      icon: input.icon,
      owner: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      subscribers_count: input._count.subscriptions,
      created_at: input.created_at.toISOString(),
    } satisfies IRedditCommunityCommunity.ISummary;
  }
}
