import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommunityAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        created_at: true,
        owner: RedditLikeMemberAtSummaryTransformer.select(),
        memberSubscriptions: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_community_subscriptionsFindManyArgs,
      },
    } satisfies Prisma.reddit_like_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunity.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? null,
      icon_url: input.icon_url ?? null,
      owner: await RedditLikeMemberAtSummaryTransformer.transform(input.owner),
      subscriber_count: input.memberSubscriptions.length,
      created_at: input.created_at.toISOString(),
    } satisfies IRedditLikeCommunity.ISummary;
  }
}
