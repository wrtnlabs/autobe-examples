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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: { id: true },
        },
        avatar: {
          select: { reddit_community_user_id: true },
        },
      },
    } satisfies Prisma.reddit_community_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserProfile.ISummary> {
    const avatarFileId = input.avatar?.reddit_community_user_id ?? null;
    const avatarImageUrl = avatarFileId
      ? `https://cdn.reddit.local/files/${avatarFileId}`
      : null;
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      avatar_image_url: avatarImageUrl ?? undefined,
      karma_score: 0, // No karma relation available on this table
      created_at: toISOStringSafe(input.created_at),
    } satisfies IRedditCommunityUserProfile.ISummary;
  }
}
