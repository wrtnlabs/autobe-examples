import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneContentSubscriptionAtSubscriptionResponseTransformer {
  export type Payload = Prisma.reddit_clone_content_subscriptionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        community: {
          select: {
            id: true,
            name: true,
            icon_url: true,
          },
        },
      },
    };
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneContentSubscription.ISubscriptionResponse> {
    return {
      communityId: input.community.id,
      communityName: input.community.name,
      communityIconUrl: input.community.icon_url ?? null,
    };
  }
}
