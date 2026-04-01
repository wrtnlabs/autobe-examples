import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";
import { RedditCommunityUserAvatarTransformer } from "./RedditCommunityUserAvatarTransformer";
import { RedditCommunityUserProfileAtSummaryTransformer } from "./RedditCommunityUserProfileAtSummaryTransformer";

export namespace RedditCommunityUserProfileTransformer {
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
        member: RedditCommunityMemberAtSummaryTransformer.select(),
        avatars: {
          select: {
            id: true,
            profile: RedditCommunityUserProfileAtSummaryTransformer.select(),
            file_name: true,
            file_size: true,
            mime_type: true,
            storage_path: true,
            created_at: true,
            updated_at: true,
          },
          orderBy: { created_at: "desc" },
          take: 1,
        } satisfies Prisma.reddit_community_user_avatarsFindManyArgs,
      },
    } satisfies Prisma.reddit_community_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      bio: input.bio ?? null,
      karma_score: input.karma_score,
      member: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.member,
      ),
      avatar:
        input.avatars.length > 0
          ? await RedditCommunityUserAvatarTransformer.transform(
              input.avatars[0],
            )
          : undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
