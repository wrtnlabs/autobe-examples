import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityUserProfileTransformer {
  export type Payload = Prisma.reddit_community_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_community_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      avatar_url: input.avatar_url ?? undefined,
      karma: Number(input.karma),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
