import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneUserProfileTransformer {
  export type Payload = Prisma.reddit_clone_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        avatar: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            username: true,
            karmaScore: {
              select: {
                score: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_clone_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneUserProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      avatar: input.avatar ?? undefined,
      username: input.member.username,
      karma_score: input.member.karmaScore?.score ?? 0,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
