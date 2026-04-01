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
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
    // Fetch karma - must exist for every user (one-to-one relationship)
    const karmaRecord =
      await MyGlobal.prisma.reddit_community_user_karmas.findFirstOrThrow({
        where: {
          reddit_community_member_id: input.user.id,
        },
      });
    // Inline transform: construct IRedditCommunityMember.ISummary for user
    const user: IRedditCommunityMember.ISummary = {
      id: input.user.id,
      username: input.user.username,
      created_at: input.user.created_at.toISOString(),
      karma:
        karmaRecord !== undefined && karmaRecord !== null
          ? Number(karmaRecord.current_score)
          : undefined,
    };
    // Inline transform: construct IRedditCommunityUserKarma
    const karma: IRedditCommunityUserKarma = {
      id: karmaRecord.id,
      reddit_member_id: karmaRecord.reddit_community_member_id,
      current_score: Number(karmaRecord.current_score),
      created_at: karmaRecord.created_at.toISOString(),
      updated_at: karmaRecord.updated_at.toISOString(),
    };
    // Posts and comments require service-level pagination - return defaults
    const posts: IPageIRedditCommunityPost.ISummary = {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      },
      data: [],
    };
    const comments: IPageIRedditCommunityComment.ISummary = {
      pagination: {
        current: 1,
        limit: 20,
        records: 0,
        pages: 0,
      },
      data: [],
    };
    return {
      id: input.id,
      user,
      avatar_image_url_id: input.avatar?.id ?? null,
      display_name: input.display_name,
      bio: input.bio ?? null,
      karma,
      posts,
      comments,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
