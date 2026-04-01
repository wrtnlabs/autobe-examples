import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityUserProfileAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            username: true,
          },
        } satisfies Prisma.reddit_community_membersFindManyArgs,
        avatars: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_community_user_avatarsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserProfile.ISummary> {
    return {
      id: input.id,
      username: input.member.username,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      karma_score: input.karma_score,
      created_at: input.created_at.toISOString(),
    };
  }
}
