import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { generate_random_community_platform_communities_posts_new_create } from "../../../generate/generate_random_community_platform_communities_posts_new_create";
export async function test_api_community_hot_posts_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random community code for this test
  const communityCode = RandomGenerator.alphaNumeric(8);
  // Create multiple posts in the community to test hot sorting
  const postCount = 5;
  const posts: {
    id: string;
    createdAt: string;
  }[] = [];
  // Create 5 text posts with different creation times (last 5 minutes)
  for (let i = 0; i < postCount; i++) {
    // Create text post with title and content
    const post =
      await generate_random_community_platform_communities_posts_new_create(
        connection,
        {
          params: { communityCode },
          body: {
            title: `Hot Test Post ${i + 1}`,
            text: RandomGenerator.content({
              paragraphs: 2,
              sentenceMin: 10,
              sentenceMax: 15,
            }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    typia.assert(post);
    // Store ID and creation time for later validation
    posts.push({ id: post.id, createdAt: post.created_at });
  }
  // Retrieve hot posts from the community
  // With limit = 5 to get exactly the created posts
  const hotPosts =
    await api.functional.communityPlatform.communities.posts.hot.index(
      connection,
      {
        communityCode,
        body: {
          sort: "hot",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  // Type validation: assert the full structure including title and content_type
  const validatedHotPosts =
    typia.assert<IPageICommunityPlatformPost.ISummary>(hotPosts);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    validatedHotPosts.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 5",
    validatedHotPosts.pagination.limit,
    5,
  );
  TestValidator.equals(
    "total records should be 5",
    validatedHotPosts.pagination.records,
    5,
  );
  TestValidator.equals(
    "total pages should be 1",
    validatedHotPosts.pagination.pages,
    1,
  );
  // Validate that we received exactly the number of posts created
  TestValidator.equals(
    "number of posts returned from hot feed should match created count",
    validatedHotPosts.data.length,
    postCount,
  );
  // Validate that each post has correct metadata and structure
  validatedHotPosts.data.forEach((post: ICommunityPlatformPost.ISummary) => {
    // Ensure required fields are present and valid
    TestValidator.equals("post should have id", typeof post.id, "string");
    // Author is ICommunityPlatformMember.ISummary which is an empty object
    TestValidator.equals(
      "post should have author",
      Object.keys(post.author).length,
      0,
    );
    // Community validation - must be ICommunityPlatformCommunity.ISummary
    TestValidator.predicate(
      "community name should be non-empty",
      post.community.name.length > 0,
    );
    TestValidator.predicate(
      "community description should be valid",
      post.community.description.length >= 0 &&
        post.community.description.length <= 1000,
    );
    TestValidator.predicate(
      "community icon should be valid URI",
      typia.is<string & tags.Format<"uri">>(post.community.icon),
    );
    TestValidator.predicate(
      "community subscriber count should be non-negative",
      post.community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community created_at should be valid date-time",
      typia.is<string & tags.Format<"date-time">>(post.community.created_at),
    );
    // ISummary properties only: voteScore, commentCount, createdAt
    // NO title or content_type in ISummary - these are in the full ICommunityPlatformPost type
    TestValidator.predicate(
      "post voteScore should be within valid range",
      post.voteScore >= -999999 && post.voteScore <= 999999,
    );
    TestValidator.predicate(
      "post comment count should be non-negative",
      post.commentCount >= 0,
    );
    TestValidator.equals(
      "post created_at should be valid date-time format",
      typia.is<string & tags.Format<"date-time">>(post.createdAt),
      true,
    );
    // Since we cannot validate title and content_type in ISummary,
    // we rely on the fact that these fields were set during creation
    // and that the API correctly returns the summary with the appropriate fields
    // as defined in the ISummary interface.
  });
  // Validate posts are ordered by hot algorithm
  // Since we can't control upvotes, assume they're equal and sort by creation time (newest first)
  const timestamps = validatedHotPosts.data.map(
    (post: ICommunityPlatformPost.ISummary) =>
      new Date(post.createdAt).getTime(),
  );
  // Check descending order of timestamps (newest first)
  for (let i = 0; i < timestamps.length - 1; i++) {
    TestValidator.predicate(
      `post ${i + 1} should be newer or same as post ${i + 2} for hot sorting`,
      timestamps[i] >= timestamps[i + 1],
    );
  }
  // Validate that all created posts are returned
  const createdIds = posts.map((p) => p.id);
  const returnedIds = validatedHotPosts.data.map(
    (p: ICommunityPlatformPost.ISummary) => p.id,
  );
  // Check all created post IDs are in retrieved data
  createdIds.forEach((id) => {
    TestValidator.predicate(
      `post ID ${id} should be in returned posts`,
      returnedIds.includes(id),
    );
  });
  // Verify no extra posts are returned
  TestValidator.equals(
    "returned posts count matches created posts count",
    returnedIds.length,
    createdIds.length,
  );
}
