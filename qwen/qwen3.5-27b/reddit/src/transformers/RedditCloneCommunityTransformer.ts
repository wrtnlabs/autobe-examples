import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneUserProfileAtSummaryTransformer } from "./RedditCloneUserProfileAtSummaryTransformer";

export namespace RedditCloneCommunityTransformer {
  export type Payload = Prisma.reddit_clone_communitiesGetPayload<
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
        owner: RedditCloneUserProfileAtSummaryTransformer.select(),
        subscriptions: {
          select: {
            deleted_at: true,
          },
        } satisfies Prisma.reddit_clone_community_subscriptionsFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunity> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      icon: input.icon,
      owner: await RedditCloneUserProfileAtSummaryTransformer.transform(
        input.owner,
      ),
      subscriber_count: input.subscriptions.filter((s) => s.deleted_at === null)
        .length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
