import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditProfileTransformer {
  export type Payload = Prisma.reddit_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        avatar: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        snapshots: true,
        moderationLogs: true,
        bannedCommunities: true,
      },
    } satisfies Prisma.reddit_profilesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditProfile> {
    return {
      id: input.id,
      displayName: input.display_name,
      bio: input.bio ?? undefined,
      avatarUrl: input.avatar ?? undefined,
      karma: input.karma,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
