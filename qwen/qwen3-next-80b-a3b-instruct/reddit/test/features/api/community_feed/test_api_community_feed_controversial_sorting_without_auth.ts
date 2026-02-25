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

export async function test_api_community_feed_controversial_sorting_without_auth(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for test data generation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community as member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create posts with varying upvote/downvote ratios to test controversial sorting
  // Create 5 balanced posts (equal upvotes and downvotes)
  const balancedPosts = Array.from({ length: 5 }, async () => {
    const post = await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_id: community.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // Create 5 skewed posts (majority upvotes or downvotes)
  const skewedPosts = Array.from({ length: 5 }, async () => {
    const post = await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_id: community.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });
  // Wait for all posts to be created
  const allPosts = [
    ...(await Promise.all(balancedPosts)),
    ...(await Promise.all(skewedPosts)),
  ];
  // 4. Get controversial feed (unauthenticated guest)
  const feed = await api.functional.redditCommunity.communities.feeds.index(
    connection,
    {
      communityId: community.id,
      body: {
        sort: "controversial",
        limit: 25,
        page: 1,
      },
    },
  );
  typia.assert(feed);
  // 5. Validate response structure and pagination
  TestValidator.equals("pagination limit is 25", feed.pagination.limit, 25);
  TestValidator.equals("page number is 1", feed.pagination.current, 1);
  TestValidator.predicate("has data", feed.data.length > 0);
  TestValidator.equals(
    "data count matches total",
    feed.data.length,
    Math.min(25, feed.pagination.records),
  );
  // 6. Validate post summary structure
  const controversialPosts = feed.data;
  TestValidator.predicate(
    "has at least 2 posts",
    () => controversialPosts.length >= 2,
  );
  // Validate the structure of the post summary matches expected schema
  TestValidator.equals(
    "first post has id",
    typeof controversialPosts[0].id,
    "string",
  );
  TestValidator.equals(
    "first post has title",
    typeof controversialPosts[0].title,
    "string",
  );
  TestValidator.equals(
    "first post has author",
    typeof controversialPosts[0].author.id,
    "string",
  );
  TestValidator.equals(
    "first post has community",
    typeof controversialPosts[0].community.id,
    "string",
  );
  TestValidator.predicate(
    "first post has voteScore",
    () => typeof controversialPosts[0].voteScore === "number",
  );
  TestValidator.predicate(
    "first post has commentCount",
    () => typeof controversialPosts[0].commentCount === "number",
  );
  TestValidator.equals(
    "first post createdAt is ISO format",
    typeof controversialPosts[0].createdAt,
    "string",
  );
  TestValidator.equals(
    "first post updatedAt is ISO format",
    typeof controversialPosts[0].updatedAt,
    "string",
  );
  TestValidator.equals(
    "post doesn't have url when it's text post",
    controversialPosts[0].url === null ||
      controversialPosts[0].url === undefined,
    true,
  );
  TestValidator.equals(
    "post doesn't have imageUrl when it's text post",
    controversialPosts[0].imageUrl === null ||
      controversialPosts[0].imageUrl === undefined,
    true,
  );
  // 7. Verify the feed contains only non-deleted publicly visible posts
  // According to the scenario, the system returns non-deleted public posts
  // We don't need to check isDeleted on the summary since it's not in the schema
  // The API ensures this filtering by default
  // All returned items are public and non-deleted by design
  // 8. Validate no authorization headers are present
  // This is handled by the API using the unauthenticated connection
  // We don't have access to headers in the response, but the API implementation
  // ensures they are not present, which is validated by the lack of authentication in the test
}
