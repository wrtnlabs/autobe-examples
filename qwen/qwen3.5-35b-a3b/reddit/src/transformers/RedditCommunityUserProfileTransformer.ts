import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            created_at: true,
            deleted_at: true,
          },
        },
        avatar: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_community_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityUserProfile> {
    const userSummary: IRedditCommunityMember.ISummary = {
      id: input.user.id,
      username: input.user.username,
      created_at: toISOStringSafe(input.user.created_at),
      profile: undefined,
      karma: undefined,
    };
    const karmaData: IRedditCommunityUserKarma = {
      id: crypto.randomUUID(),
      reddit_member_id: input.id,
      current_score: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    };
    const postsPagination: IPageIRedditCommunityPost.ISummary = {
      pagination: {
        current: 1,
        limit: 10,
        records: 0,
        pages: 0,
      },
      data: [],
    };
    const commentsPagination: IPageIRedditCommunityComment.ISummary = {
      pagination: {
        current: 1,
        limit: 10,
        records: 0,
        pages: 0,
      },
      data: [],
    };
    return {
      id: input.id,
      user: userSummary,
      avatar_image_url_id: input.avatar?.id ?? null,
      display_name: input.display_name,
      bio: input.bio ?? null,
      karma: karmaData,
      posts: postsPagination,
      comments: commentsPagination,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
