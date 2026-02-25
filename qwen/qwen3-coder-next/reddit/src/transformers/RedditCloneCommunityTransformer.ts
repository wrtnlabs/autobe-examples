import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneOwnerAtSummaryTransformer } from "./RedditCloneOwnerAtSummaryTransformer";

export namespace RedditCloneCommunityTransformer {
  // Payload type
  export type Payload = Prisma.reddit_clone_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  // Select function - loads database data
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        owner: RedditCloneOwnerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_communitiesFindManyArgs;
  }
  // Transform function - converts database data to DTO
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunity> {
    return {
      id: input.id,
      owner: await RedditCloneOwnerAtSummaryTransformer.transform(input.owner),
      name: input.name,
      description: input.description ?? null,
      iconUrl: input.icon_url ?? null,
      subscriberCount: input.subscriber_count,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
