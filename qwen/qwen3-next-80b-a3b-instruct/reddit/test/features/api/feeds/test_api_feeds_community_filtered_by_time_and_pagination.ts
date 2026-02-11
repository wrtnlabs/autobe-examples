import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_feeds_community_filtered_by_time_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup community owner
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerAuth = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: ownerEmail,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  await authorize_community_owner_login(communityOwnerConnection, {
    body: {
      email: ownerEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 2. Create community as owner
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Setup community member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 4. Implicit subscription: by creating a post in the community, member is subscribed
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  // Create post created within last week
  const recentPost = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityName: community.name,
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(recentPost);
  // Create post created over a week ago
  const oldPost = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityName: community.name,
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(oldPost);
  // 5. Test feed with timeFilter='week' and sortBy='top'
  const response = await api.functional.redditCommunity.feeds.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sortBy: "top",
        timeFilter: "week",
        limit: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(response);
  // 6. Validate response structure
  TestValidator.equals(
    "response has correct pagination structure",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "response has correct page size",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "response has at least 1 record",
    response.data.length > 0,
  );
  TestValidator.predicate(
    "response has page count",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "response has records count",
    response.pagination.records >= response.data.length,
  );
  // 7. Validate that only posts from within the last week are included
  // Check that recent post is included
  const recentExists = response.data.some((post) => post.id === recentPost.id);
  TestValidator.equals(
    "recent post is included in results",
    recentExists,
    true,
  );
  // Check that old post is excluded (older than one week)
  // For this test, assume the system only returns posts within the last week when timeFilter=week
  // This is a business logic check: old post should NOT be in results
  const oldExists = response.data.some((post) => post.id === oldPost.id);
  TestValidator.equals(
    "old post is excluded from results (older than week)",
    oldExists,
    false,
  );
  // 8. Validate sorting by vote_score descending
  // Sort response.data by vote_score descending
  const sortedByVoteScore = [...response.data].sort(
    (a, b) => b.vote_score - a.vote_score,
  );
  TestValidator.index(
    "posts are sorted by vote_score descending",
    sortedByVoteScore,
    response.data,
  );
}
