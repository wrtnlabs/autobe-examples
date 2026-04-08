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

export namespace RedditCommunityCommunityTransformer {
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
        updated_at: true,
        deleted_at: true,
        owner: RedditCommunityMemberAtSummaryTransformer.select(),
        subscriptions: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_subscriptionsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunity> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon: input.icon,
      owner: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.owner,
      ),
      subscriber_count: input.subscriptions.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditCommunityCommunity;
  }
}
