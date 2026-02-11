import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityPlatformAdminAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_platform_adminsGetPayload<
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
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_community_platform_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPlatformAdmin.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio ?? null,
      avatar_url: input.avatar_url ?? null,
      karma: input.karma,
    };
  }
}
