import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_post_votes_cast } from "../../../generate/generate_random_reddit_platform_member_post_votes_cast";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_feed_home_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create community
  const community: IRedditPlatformCommunity =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription: IRedditPlatformCommunitySubscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberConnection,
      {
        body: { confirmSubscription: true },
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create posts
  const textPost: IRedditPlatformPost =
    await generate_random_reddit_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 6,
          }),
          postType: "TEXT",
          redditPlatformCommunityId: community.id,
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        },
      },
    );
  typia.assert(textPost);
  const linkPost: IRedditPlatformPost =
    await generate_random_reddit_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 6,
          }),
          postType: "LINK",
          redditPlatformCommunityId: community.id,
          url: typia.random<string & tags.Format<"uri"> & tags.MaxLength<80000>>(),
        },
      },
    );
  typia.assert(linkPost);
  // 5. Cast votes to create different scores
  const vote1 = await generate_random_reddit_platform_member_post_votes_cast(
    memberConnection,
    {
      body: {
        post_id: textPost.id,
        vote_type: "UPVOTE",
      },
    },
  );
  typia.assert(vote1);
  const vote2 = await generate_random_reddit_platform_member_post_votes_cast(
    memberConnection,
    {
      body: {
        post_id: linkPost.id,
        vote_type: "DOWNVOTE",
      },
    },
  );
  typia.assert(vote2);
  // 6. Fetch home feed with NEW sorting
  const newFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort_type: "NEW",
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(newFeed);
  // 7. Fetch home feed with HOT sorting
  const hotFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort_type: "HOT",
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(hotFeed);
  // 8. Fetch home feed with TOP sorting
  const topFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort_type: "TOP",
          time_range: "ALL",
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(topFeed);
  // 9. Fetch home feed with CONTROVERSIAL sorting
  const controversialFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort_type: "CONTROVERSIAL",
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(controversialFeed);
  // 10. Validate post counts
  TestValidator.equals("new feed post count", newFeed.data.length, 2);
  TestValidator.equals("hot feed post count", hotFeed.data.length, 2);
  TestValidator.equals("top feed post count", topFeed.data.length, 2);
  TestValidator.equals(
    "controversial feed post count",
    controversialFeed.data.length,
    2,
  );
  // 11. Validate new feed order (most recent first)
  if (newFeed.data.length >= 2) {
    const firstPostDate = new Date(newFeed.data[0].created_at).getTime();
    const secondPostDate = new Date(newFeed.data[1].created_at).getTime();
    TestValidator.predicate(
      "new feed sorted by created_at DESC",
      firstPostDate > secondPostDate,
    );
  }
  // 12. Validate vote scores
  const textPostInNewFeed = newFeed.data.find((p) => p.id === textPost.id);
  const linkPostInNewFeed = newFeed.data.find((p) => p.id === linkPost.id);
  if (textPostInNewFeed) {
    typia.assertGuard(textPostInNewFeed);
    TestValidator.equals(
      "text post vote score",
      textPostInNewFeed.vote_score,
      vote1.vote_type === "UPVOTE" ? 1 : -1,
    );
    TestValidator.equals(
      "text post author username",
      textPostInNewFeed.author.username,
      member.username,
    );
    TestValidator.equals(
      "text post community name",
      textPostInNewFeed.community.name,
      community.name,
    );
  } else {
    throw new Error("textPostInNewFeed not found");
  }
  if (linkPostInNewFeed) {
    typia.assertGuard(linkPostInNewFeed);
    TestValidator.equals(
      "link post vote score",
      linkPostInNewFeed.vote_score,
      vote2.vote_type === "DOWNVOTE" ? -1 : 1,
    );
  } else {
    throw new Error("linkPostInNewFeed not found");
  }
  // 13. Validate author username (moved into if block above)
  // 14. Validate community name (moved into if block above)
  // 15. Test pagination
  const page2NewFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.feeds.home.index(
      memberConnection,
      {
        body: {
          sort_type: "NEW",
          limit: 1,
          page: 2,
        },
      },
    );
  typia.assert(page2NewFeed);
  TestValidator.equals("page 2 current", page2NewFeed.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2NewFeed.pagination.limit, 1);
  TestValidator.equals("page 2 records", page2NewFeed.pagination.records, 2);
  TestValidator.equals("page 2 pages", page2NewFeed.pagination.pages, 2);
  // 16. Validate pagination data size
  TestValidator.equals("page 2 data length", page2NewFeed.data.length, 1);
}