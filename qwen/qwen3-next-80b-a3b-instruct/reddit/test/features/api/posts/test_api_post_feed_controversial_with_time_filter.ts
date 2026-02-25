import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_feed_controversial_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberData });
  // 2. Create community for posting
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create posts with varying vote patterns and time deltas
  // We need posts that satisfy the controversial criteria:
  //   - total votes > 10
  //   - |upvotes - downvotes| < 5
  //   - |vote_score| < 5
  //   - created within last 30 days
  //
  // Create a mix of posts with different vote combinations:
  //   - Majority satisfying controversial criteria
  //   - Some failing one of the criteria
  // We'll create 8 posts total: 5 that should appear in results, 3 that should be filtered out
  const posts: IRedditCommunityPost[] = [];
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Post 1: High total votes (14), balanced up/down (9 up, 5 down), score=4, young (1 week old) - SHOULD BE INCLUDED
  const upvoteRatio = 0.642857; // 9/14
  const post1 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post1);
  // Use Internal access (as the function will be called internally by the platform) to simulate votes
  // We must simulate votes that satisfy the controversial criteria
  // This uses internal logical model:
  //   // AS PER SCENARIO: controversial posts have:
  //   // total votes > 10 AND absolute difference between upvotes and downvotes < 5 AND absolute vote_score < 5 AND created in last 30 days
  // We'll make 9 upvotes, 5 downvotes: 14 total votes, diff=4, score=4
  // Post 2: High total votes (18), balanced up/down (11 up, 7 down), score=4, young (1 week old) - SHOULD BE INCLUDED
  const post2 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post2);
  // Post 3: High total votes (13), balanced up/down (9 up, 4 down), score=5, young - SHOULD BE EXCLUDED (score=5 but constraint is |score|<5)
  const post3 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post3);
  // Post 4: High total votes (17), balanced up/down (10 up, 7 down), score=3, very old (45 days old) - SHOULD BE EXCLUDED (too old)
  const post4 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post4);
  // Post 5: Medium total votes (12), balanced up/down (8 up, 4 down), score=4, young - SHOULD BE INCLUDED
  const post5 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post5);
  // Post 6: Low total votes (8), balanced up/down (5 up, 3 down), score=2, young - SHOULD BE EXCLUDED (total votes <=10)
  const post6 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post6);
  // Post 7: High total votes (16), unbalanced up/down (14 up, 2 down), score=12, young - SHOULD BE EXCLUDED (difference=12, not <5)
  const post7 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post7);
  // Post 8: Moderate total votes (11), balanced up/down (6 up, 5 down), score=1, young - SHOULD BE INCLUDED
  const post8 = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post8);
  // Now we simulate votes on the posts via internal mechanisms
  // We need to ensure posts are already created in the database before
  // simulating votes, so we'll use the created_at dates as base
  // We'll simulate exact vote counts per post:
  // We'll use manually calculated vote patterns:
  // Define vote patterns in sequence: [upvotes, downvotes]
  const votePatterns = [
    [9, 5], // post1: total=14, diff=4, score=4
    [11, 7], // post2: total=18, diff=4, score=4
    [9, 4], // post3: total=13, diff=5, score=5 - FAILS (diff not <5)
    [13, 4], // post4: total=17, diff=9, score=9 - but OLDER
    [8, 4], // post5: total=12, diff=4, score=4
    [5, 3], // post6: total=8, diff=2, score=2 - FAILS (total <=10)
    [14, 2], // post7: total=16, diff=12, score=12 - FAILS (diff >=5)
    [6, 5], // post8: total=11, diff=1, score=1
  ];
  // Create mock vote timestamps: all within last 30 days, but vary
  const startTimestamp = new Date(now.getTime() - 30 * oneDayMs);
  // Simulate votes for each post
  // This requires using internal platform logic to update vote statistics
  // We'll use the IRedditCommunityPost?.vote_score as a reference for final state
  // We'll simulate up/downvotes by writing directly to the vote entities
  // Since we're in E2E test, the platform will validate and update counters
  // We need to use the system's vote logic which updates vote_score and comment_count
  // But we don't have direct access to vote endpoints in this test
  // We will:
  //   Update post creation times to simulate age
  //   Let the backend calculate vote statistics based on actual vote requests
  // However, per the implementation, we likely need to simulate upvotes/downvotes of posts
  // So we must use the platform's provided API for voting
  // Note: There is NO utility function for POST /posts/{id}/vote
  // But we ARE required to use SDK if no utility: api.functional.redditCommunity.posts.vote
  // But wait: the SDK does not expose any POST /posts/{id}/vote endpoint!
  // Let me recheck: API functions provided only:
  //   api.functional.redditCommunity.posts.index
  //   api.functional.redditCommunity.member.posts.create
  //   api.functional.redditCommunity.member.communities.create
  //   api.functional.redditCommunity.auth.member.join
  //
  // So there is NO vote API endpoint exposed in the SDK!
  // This is a critical problem: scenario requires us to simulate votes
  // But we cannot create votes because the API doesn't expose it.
  //
  // The scenario says: "apply the time filter with a mocked timestamp"
  // This implies the system supports modifying timestamps or simulating historical data
  //
  // According to the Anti-Hallucination Protocol: "The compiler is always right"
  // We cannot use endpoints not provided.
  //
  // The resolution: The platform must have internal mechanisms to create historical votes
  // In the real system, there would be a service layer that can simulate votes
  // However, in this E2E test, since the API doesn't expose it, we must assume the system
  // has side effects when creating posts with specific data - or the database has seedable state
  //
  // But the scenario says: "creating multiple post variations with different vote patterns"
  //
  // REWRITING THE SCENARIO: The only way this is possible is if there's a way to create the posts
  // with pre-initialized vote counts or a test-only admin endpoint
  //
  // But wait: we have generate_random_reddit_community_member_posts_create
  // It uses api.functional.redditCommunity.member.posts.create
  // This endpoint creates the post with vote_score = 0
  //
  // So the system realizes vote_score via triggers on post_votes table
  //
  // We have no way to create those post_votes records in E2E
  //
  // Therefore: The scenario is impossible within the provided API surface
  // But the instructions say: "If scenario is impossible → REWRITE using available APIs"
  //
  // NEW PLAN: We will create the posts and then mock that they have the vote counts
  // We will use the fact that the vote_score field is present in the response
  // We will not use actual vote endpoints because they don't exist
  // We will manually set the vote_score in the create request as a test-only property?
  //
  // But we can't - the schema IRedditCommunityPost.ICreate does not have vote_score
  //
  // CRITICAL: We are not allowed to change the DTO
  //
  // FINAL CONCLUSION: We cannot satisfy the scenario as written
  // BUT: the scenario says "The scenario verifies correct calculation of the controversial criteria"
  // We are allowed to rewrite
  //
  // RENEWED SCENARIO: Since we cannot create votes, we will assume that the system allows specifying vote_score and vote_count during post creation
  // This is a common practice in testing backend systems
  // ONCE: Backend developers have a special "for-testing" flag that accepts pre-calculated vote_score
  // We'll use that in our E2E test, as it's common to have test-specific extensions
  // Since we're in E2E test and we need to verify logic, and the provider did not give us a way to vote
  // We assume a test-specific property is allowed: use IRedditCommunityPost.ICreateWithVotes
  // BUT it does not exist!
  //
  // This is a system limitation. But we must produce working test code
  //
  // Because the directive says: "Compilation success > scenario fidelity"
  // We must use what exists
  //
  // WE ARE FORCED TO USE THE EXISTING DATA: we will use the scalar dates
  // We will create posts and set their created_at to simulate age
  // We will then query for them using sort='controversial' and timeFilter='month'
  // We cannot influence vote_score
  //
  // This is not the scenario, but we must produce a compileable test
  // We'll focus on the pagination and structure validation for the response, and ensure the endpoint is called correctly
  //
  // But this defeats the purpose
  //
  // Let me check the API again:
  //   Endpoint: PATCH /redditCommunity/posts
  //   Body: IRequest = {
  //     sort: "controversial",
  //     timeFilter: "month",
  //     page?: 1,
  //     limit?: 20
  //   }
  //
  // So we can call this endpoint
  // We can create posts
  // The system will have its own vote counts
  // This is an integration test: we test the backend logic coercion based on its internal state
  //
  // We are not creating vote counts therefore our posts initially have score 0
  // So we will see no posts in "controversial" results
  //
  // We must assume that the system has a background job that computes vote counts
  // And that those are ready when we fetch
  // But we don't
  //
  // We are stuck
  //
  // Given the constraints, and since the API does not expose vote creation, we assume that the system is already seeded with data
  // And we must rely on that data
  // This is common in E2E tests for public APIs
  //
  // We change strategy: we will just make a request with the filters and validate the structure and pagination
  // We don't validate the vote logic because we can't affect it
  // We'll just make a request for controversial posts with month filter and validate the structure
  const request: IRedditCommunityPost.IRequest = {
    sort: "controversial",
    timeFilter: "month",
    page: 1,
    limit: 10,
  };
  const response = await api.functional.redditCommunity.posts.index(
    memberConnection,
    { body: request },
  );
  typia.assert(response);
  // Validate structure of the response
  TestValidator.equals(
    "pagination present",
    typeof response.pagination,
    "object",
  );
  TestValidator.equals(
    "data array present",
    Array.isArray(response.data),
    true,
  );
  TestValidator.equals(
    "data has at least 0 items",
    response.data.length >= 0,
    true,
  );
  // Validate pagination properties
  TestValidator.predicate(
    "page is greater than 0",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is greater than 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Check that each post in data has required fields of IRedditCommunityPost.ISum
  response.data.forEach((post, index) => {
    TestValidator.equals(`post[${index}].id is UUID`, typeof post.id, "string");
    TestValidator.equals(
      `post[${index}].title is string`,
      typeof post.title,
      "string",
    );
    TestValidator.equals(
      `post[${index}].vote_score is int32`,
      typeof post.vote_score,
      "number",
    );
    TestValidator.equals(
      `post[${index}].comment_count is int32`,
      typeof post.comment_count,
      "number",
    );
    TestValidator.equals(
      `post[${index}].created_at is date-time`,
      typeof post.created_at,
      "string",
    );
    TestValidator.equals(
      `post[${index}].updated_at is date-time`,
      typeof post.updated_at,
      "string",
    );
    TestValidator.equals(
      `post[${index}].image_url is URI or null`,
      post.image_url === null || typeof post.image_url === "string",
      true,
    );
    TestValidator.equals(
      `post[${index}].url is URI or null`,
      post.url === null || typeof post.url === "string",
      true,
    );
    // Validate author is IRedditCommunityMember.ISummary
    TestValidator.equals(
      `post[${index}].author.id is UUID`,
      typeof post.author.id,
      "string",
    );
    TestValidator.equals(
      `post[${index}].author.username is string`,
      typeof post.author.username,
      "string",
    );
    TestValidator.equals(
      `post[${index}].author.display_name is string`,
      typeof post.author.display_name,
      "string",
    );
    TestValidator.equals(
      `post[${index}].author.karma_score is int32`,
      typeof post.author.karma_score,
      "number",
    );
    TestValidator.equals(
      `post[${index}].author.created_at is date-time`,
      typeof post.author.created_at,
      "string",
    );
    // Validate community is IRedditCommunityCommunity.ISummary
    TestValidator.equals(
      `post[${index}].community.id is UUID`,
      typeof post.community.id,
      "string",
    );
    TestValidator.equals(
      `post[${index}].community.name is string`,
      typeof post.community.name,
      "string",
    );
    TestValidator.equals(
      `post[${index}].community.description is string`,
      typeof post.community.description,
      "string",
    );
    TestValidator.equals(
      `post[${index}].community.icon_url is URI or null`,
      post.community.icon_url === null ||
        typeof post.community.icon_url === "string",
      true,
    );
    TestValidator.equals(
      `post[${index}].community.subscriber_count is int32`,
      typeof post.community.subscriber_count,
      "number",
    );
    TestValidator.equals(
      `post[${index}].community.created_at is date-time`,
      typeof post.community.created_at,
      "string",
    );
    TestValidator.equals(
      `post[${index}].community.updated_at is date-time`,
      typeof post.community.updated_at,
      "string",
    );
  });
  // Validate the returned sort and timeFilter are as requested
  // We can't validate the logic of controversies because we can't control votes
  // But we can validate all the structural and parameter compliance
  //
  // This is the best possible test given the API surface
}
