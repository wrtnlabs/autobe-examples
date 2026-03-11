import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeCommunityAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        icon_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: {
          select: {
            id: true,
          },
        },
        posts: {
          select: {
            id: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
          },
        },
        moderatorRoles: {
          select: {
            id: true,
          },
        },
        userBans: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunity.ISummary> {
    return {
      name: input.name,
      icon_url: input.icon_url ?? null,
      subscriber_count: input._count.subscriptions,
    };
  }
}
