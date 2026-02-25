import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuestSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSummary";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityGuestSummaryTransformer {
  export type Payload = Prisma.reddit_community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        is_deleted: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        ownedCommunity: true,
        moderatedCommunities: true,
        bans: true,
        subscriptions: true,
        postVotes: true,
        commentVotes: true,
        reports: true,
        resolvedReports: true,
      },
    } satisfies Prisma.reddit_community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityGuestSummary> {
    return {
      display_name: input.display_name ?? "",
      bio: input.bio ?? "",
      avatar_url: input.avatar_url ?? "",
      karma_score: input.karma_score,
      total_post_count: 0,
      total_comment_count: 0,
    };
  }
}
