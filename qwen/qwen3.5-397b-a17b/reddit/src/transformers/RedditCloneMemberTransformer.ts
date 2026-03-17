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
        username: true,
        display_name: true,
        bio: true,
        avatar: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        karmaScore: {
          select: {
            score: true,
          },
        } satisfies Prisma.reddit_clone_karma_scoresFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCloneMember> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      avatar: input.avatar ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      karma_score: input.karmaScore?.score ?? 0,
    };
  }
}
