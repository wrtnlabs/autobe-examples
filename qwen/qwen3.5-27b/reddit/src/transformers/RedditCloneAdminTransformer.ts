import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneAdminTransformer {
  export type Payload = Prisma.reddit_clone_adminsGetPayload<
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
        avatar: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_clone_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCloneAdmin> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      displayName: input.display_name,
      bio: input.bio ?? null,
      avatar: input.avatar ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
