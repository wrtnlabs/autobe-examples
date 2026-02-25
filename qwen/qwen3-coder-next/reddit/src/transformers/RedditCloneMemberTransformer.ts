import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneMemberTransformer {
  export type Payload = Prisma.reddit_clone_membersGetPayload<
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
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_clone_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCloneMember> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      displayName: input.display_name ?? null,
      bio: input.bio ?? null,
      avatarUrl: input.avatar_url ?? null,
      karma: input.karma ? Number((input.karma as any).score) : 0,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: input.updated_at
        ? toISOStringSafe(input.updated_at)
        : undefined,
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
