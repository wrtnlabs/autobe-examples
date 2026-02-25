import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityPlatformAdminTransformer {
  export type Payload = Prisma.reddit_community_platform_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        is_deleted: true,
        sessions: true,
        passwordResets: true,
        emailVerification: true,
      },
    } satisfies Prisma.reddit_community_platform_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPlatformAdmin> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name ?? undefined,
      bio: input.bio ?? undefined,
      avatar_url: input.avatar_url ?? undefined,
      karma_score: input.karma_score,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
