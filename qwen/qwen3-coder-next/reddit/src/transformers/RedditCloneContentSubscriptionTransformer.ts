import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneContentSubscriptionTransformer {
  export type Payload = Prisma.reddit_clone_content_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        member_id: true,
        community_id: true,
        created_at: true,
        updated_at: true,
        member: {
          select: {
            id: true,
          },
        },
        community: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_clone_content_subscriptionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentSubscription> {
    return {
      id: input.id,
      member_id: input.member_id,
      community_id: input.community_id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
