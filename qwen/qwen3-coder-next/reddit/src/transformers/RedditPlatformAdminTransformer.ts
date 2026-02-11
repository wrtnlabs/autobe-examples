import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformAdminTransformer {
  export type Payload = Prisma.reddit_platform_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_platform_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformAdmin> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      displayName: input.display_name ?? undefined,
      bio: input.bio ?? undefined,
      avatarUrl: input.avatar_url ?? undefined,
      karmaScore: input.karma_score,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at ? input.updated_at.toISOString() : undefined,
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
