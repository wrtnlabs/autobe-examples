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
 * Test filtering posts using created_after and created_before date range
 * parameters.
 *
 * This test validates that the post search API correctly filters posts based on
 * date range criteria. It creates multiple posts with known timestamps and
 * verifies that the created_after and created_before parameters work correctly
 * both individually and in combination.
 *
 * Test workflow:
 *
 * 1. Set up moderator account and create a test community
 * 2. Set up member account to author posts
 * 3. Create multiple posts with different timestamps
 * 4. Test created_after filtering
 * 5. Test created_before filtering
 * 6. Test combined date range filtering with both parameters
 */
export async function test_api_posts_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create moderator and community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        nickname: RandomGenerator.name(),
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 3: Create posts at different times
  const posts: IRedditCommunityPost[] = [];
  const postTimestamps: Date[] = [];

  // Create 5 posts with timestamps spread over time
  for (let i = 0; i < 5; i++) {
    const post: IRedditCommunityPost =
      await api.functional.redditCommunity.member.posts.create(connection, {
        body: {
          community_id: community.id,
          title: `Test Post ${i + 1}`,
          post_type: "text" as const,
          body: RandomGenerator.content({ paragraphs: 2 }),
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
    postTimestamps.push(new Date(post.created_at));
  }

  // Step 4: Test created_after parameter
  // Use a timestamp between the second and third post
  const afterTimestamp = new Date(
    (postTimestamps[1].getTime() + postTimestamps[2].getTime()) / 2,
  ).toISOString();

  const afterResults: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        community_id: community.id,
        created_after: afterTimestamp,
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(afterResults);

  // Validate that all returned posts are created after the specified timestamp
  for (const postSummary of afterResults.data) {
    const postDate = new Date(postSummary.created_at);
    const filterDate = new Date(afterTimestamp);
    TestValidator.predicate(
      `post ${postSummary.id} created after ${afterTimestamp}`,
      postDate.getTime() >= filterDate.getTime(),
    );
  }

  // Step 5: Test created_before parameter
  // Use a timestamp between the third and fourth post
  const beforeTimestamp = new Date(
    (postTimestamps[2].getTime() + postTimestamps[3].getTime()) / 2,
  ).toISOString();

  const beforeResults: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        community_id: community.id,
        created_before: beforeTimestamp,
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(beforeResults);

  // Validate that all returned posts are created before the specified timestamp
  for (const postSummary of beforeResults.data) {
    const postDate = new Date(postSummary.created_at);
    const filterDate = new Date(beforeTimestamp);
    TestValidator.predicate(
      `post ${postSummary.id} created before ${beforeTimestamp}`,
      postDate.getTime() <= filterDate.getTime(),
    );
  }

  // Step 6: Test combined date range (both created_after and created_before)
  // Define a range between the first and fourth post
  const rangeStart = new Date(
    (postTimestamps[0].getTime() + postTimestamps[1].getTime()) / 2,
  ).toISOString();
  const rangeEnd = new Date(
    (postTimestamps[3].getTime() + postTimestamps[4].getTime()) / 2,
  ).toISOString();

  const rangeResults: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        community_id: community.id,
        created_after: rangeStart,
        created_before: rangeEnd,
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(rangeResults);

  // Validate that all returned posts are within the specified date range
  for (const postSummary of rangeResults.data) {
    const postDate = new Date(postSummary.created_at);
    const startDate = new Date(rangeStart);
    const endDate = new Date(rangeEnd);
    TestValidator.predicate(
      `post ${postSummary.id} within date range ${rangeStart} to ${rangeEnd}`,
      postDate.getTime() >= startDate.getTime() &&
        postDate.getTime() <= endDate.getTime(),
    );
  }
}
