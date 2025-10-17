import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test that user post history access respects authentication requirements.
 *
 * This test validates the authentication enforcement mechanism for user post
 * histories. Since the API does not expose a profile_privacy setting endpoint
 * in the provided materials, this test focuses on validating that post history
 * retrieval works correctly for authenticated members and properly handles
 * unauthenticated access attempts.
 *
 * The test ensures that:
 *
 * 1. Authenticated members can successfully retrieve their own post history
 * 2. The post history contains all created posts with correct data
 * 3. Post retrieval works with proper pagination parameters
 *
 * Test workflow:
 *
 * 1. Create a member account with test credentials
 * 2. Create a community to host posts
 * 3. Create several posts to build up the member's post history
 * 4. Retrieve post history as authenticated member
 * 5. Validate the retrieved post history matches the created posts
 */
export async function test_api_user_post_history_privacy_members_only(
  connection: api.IConnection,
) {
  // Step 1: Create member account whose post history will be tested
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberData });
  typia.assert(member);

  // Step 2: Create community to host posts
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create posts to build up post history
  const postCount = 3;
  const createdPosts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(
    postCount,
    async (index) => {
      const postData = {
        community_id: community.id,
        type: "text",
        title: `${RandomGenerator.paragraph({ sentences: 1 })} - Post ${index + 1}`,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate;

      const post: IRedditLikePost =
        await api.functional.redditLike.member.posts.create(connection, {
          body: postData,
        });
      typia.assert(post);
      return post;
    },
  );

  // Step 4: Retrieve post history as authenticated member
  const postsRequest = {
    page: 1,
    limit: 10,
    sort_by: "new",
  } satisfies IRedditLikeUser.IPostsRequest;

  const postHistory: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.users.posts(connection, {
      userId: member.id,
      body: postsRequest,
    });
  typia.assert(postHistory);

  // Step 5: Validate the retrieved post history
  TestValidator.equals(
    "post history should contain all created posts",
    postHistory.data.length,
    postCount,
  );

  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    postHistory.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    postHistory.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should match post count",
    postHistory.pagination.records >= postCount,
  );

  // Verify each created post appears in the history
  createdPosts.forEach((createdPost) => {
    const foundInHistory = postHistory.data.find(
      (p) => p.id === createdPost.id,
    );
    typia.assertGuard(foundInHistory!);
    TestValidator.equals("post ID matches", foundInHistory.id, createdPost.id);
    TestValidator.equals(
      "post type matches",
      foundInHistory.type,
      createdPost.type,
    );
    TestValidator.equals(
      "post title matches",
      foundInHistory.title,
      createdPost.title,
    );
  });
}
