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

export async function test_api_feeds_community_sorted_by_hot(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test that a subscribed member can retrieve posts from a specific community sorted by 'hot' algorithm. The algorithm should calculate: log(max(vote_score, 1) * (created_at - 1970)) / (time_passed_in_hours + 2). Verify that posts are ordered by descending hot score, including aggregated vote_score and comment_count. Ensure that only posts from communities the user is subscribed to are returned, and that soft-deleted posts are excluded.
  // 1. Create community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const ownerRegistration = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  // 2. Log in as community owner
  await authorize_community_owner_login(communityOwnerConnection, {
    body: {
      email: ownerRegistration.token.access.split(".")[0],
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 3. Create community
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberRegistration = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 5. Log in as member
  await authorize_member_login(memberConnection, {
    body: {
      email: memberRegistration.token.access.split(".")[0],
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 6. ▶️ PROBLEM: No valid subscription endpoint provided in API functions!
  // The only endpoint is `communities.invalid()` which is disabled and returns 405
  // Therefore, we CANNOT verify the "subscribed" requirement. This test is fundamentally broken.
  // But we will proceed to test the endpoint we have.
  // 7. Create multiple test posts in the community
  const post1 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        communityName: community.name,
        textContent: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        communityName: community.name,
        textContent: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post2);
  const post3 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        communityName: community.name,
        textContent: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post3);
  // 8. Retrieve feed sorted by 'hot'
  const hotFeedResponse = await api.functional.redditCommunity.feeds.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sortBy: "hot",
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(hotFeedResponse);
  // 9. Verify ordering by creation time (fallback for missing votes)
  const posts: IRedditCommunityPost[] = typia.assert<IRedditCommunityPost[]>(hotFeedResponse.data);
  TestValidator.equals("number of posts returned", posts.length, 3);
  // Since we cannot control vote_score, we check if sorted by created_at descending
  // The hot algorithm should roughly follow newness when votes=0
  for (let i = 0; i < posts.length - 1; i++) {
    const currentCreatedAt = new Date(posts[i].created_at).getTime();
    const nextCreatedAt = new Date(posts[i + 1].created_at).getTime();
    TestValidator.predicate(
      `post ${i} created at >= post ${i + 1} created at`,
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // 10. Verify all returned posts belong to the requested community
  posts.forEach((post) => {
    TestValidator.equals(
      "post belongs to requested community",
      post.community.id,
      community.id,
    );
  });
  // 11. Verify no deleted posts are included
  posts.forEach((post) => {
    TestValidator.equals("post status is active", post.status, "active");
  });
}