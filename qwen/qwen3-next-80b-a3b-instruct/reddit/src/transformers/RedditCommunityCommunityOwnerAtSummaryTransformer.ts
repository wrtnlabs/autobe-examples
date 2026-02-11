import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityCommunityOwnerAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_community_ownersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_community_community_ownersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunityOwner.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      avatar_url: input.avatar_url ?? undefined,
    };
  }
}
