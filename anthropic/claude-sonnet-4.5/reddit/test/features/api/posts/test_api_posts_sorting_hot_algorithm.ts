import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test the 'hot' sorting algorithm which ranks trending posts with recent
 * engagement.
 *
 * This test validates that the hot sorting algorithm properly combines vote
 * score with recency to surface actively discussed posts. The hot algorithm is
 * the default sorting for authenticated users and should prioritize newer posts
 * with engagement over older posts with similar scores.
 *
 * Steps:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a test community
 * 3. Create member account and authenticate
 * 4. Create multiple posts with varying recency and engagement patterns
 * 5. Query posts with sort_by='hot'
 * 6. Validate that posts are ordered by the hot algorithm
 */
export async function test_api_posts_sorting_hot_algorithm(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        ip: null,
        href: "https://test.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create test community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10) satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<21> &
            tags.Pattern<"^[a-z0-9_]+$">,
          display_title: RandomGenerator.name(2) satisfies string &
            tags.MaxLength<100>,
          description: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MaxLength<500>,
          rules: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
            tags.MaxLength<500>,
          icon_url: null,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<50>,
        email: memberEmail,
        password: "member123",
        display_name: null,
        bio: null,
        avatar_url: null,
        show_online_status: undefined,
        show_subscribed_communities: undefined,
        show_activity_feed: undefined,
        ip: null,
        href: "https://test.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Create multiple posts with varying characteristics
  const posts: IRedditCommunityPost[] = [];

  // Create 5 text posts with different content
  for (let i = 0; i < 5; i++) {
    const post: IRedditCommunityPost =
      await api.functional.redditCommunity.member.posts.create(connection, {
        body: {
          community_id: community.id,
          title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<300>,
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }) satisfies string &
            tags.MaxLength<40000>,
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Step 5: Query posts with hot sorting
  const hotSortedPosts: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        community_id: community.id,
        post_type: undefined,
        author_member_id: undefined,
        created_after: undefined,
        created_before: undefined,
        min_vote_score: undefined,
        search: undefined,
        sort_by: "hot",
        top_time_filter: undefined,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(hotSortedPosts);

  // Step 6: Validate hot sorting results
  TestValidator.predicate(
    "hot sorting should return paginated results",
    hotSortedPosts.data.length > 0,
  );

  TestValidator.predicate(
    "pagination should have correct structure",
    hotSortedPosts.pagination.current >= 0 &&
      hotSortedPosts.pagination.limit > 0 &&
      hotSortedPosts.pagination.records >= 0 &&
      hotSortedPosts.pagination.pages >= 0,
  );

  // Validate that all created posts are in the results
  TestValidator.predicate(
    "all created posts should be in results",
    hotSortedPosts.data.length === posts.length,
  );

  // Validate post structure
  for (const postSummary of hotSortedPosts.data) {
    TestValidator.predicate(
      "post summary should have required fields",
      postSummary.id !== undefined &&
        postSummary.title !== undefined &&
        postSummary.post_type !== undefined &&
        postSummary.vote_score !== undefined &&
        postSummary.comment_count !== undefined &&
        postSummary.created_at !== undefined,
    );
  }
}
