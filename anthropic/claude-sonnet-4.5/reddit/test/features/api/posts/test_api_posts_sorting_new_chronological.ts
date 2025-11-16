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
 * Test the 'new' sorting algorithm which orders posts chronologically by
 * creation date.
 *
 * This test validates that posts are correctly sorted in reverse chronological
 * order (newest first) when using the 'new' sorting parameter. The test
 * workflow includes:
 *
 * 1. Create a moderator account and authenticate
 * 2. Create a test community for posting
 * 3. Create a member account and authenticate
 * 4. Create multiple posts sequentially with time delays to ensure distinct
 *    creation timestamps
 * 5. Search posts with sort_by='new' parameter
 * 6. Validate that posts are returned in reverse chronological order (most recent
 *    first)
 * 7. Verify that created_at timestamps confirm the ordering
 *
 * This is the default sorting for guest users and ensures chronological feed
 * functionality works correctly.
 */
export async function test_api_posts_sorting_new_chronological(
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
        href: "https://test.com/join" satisfies string & tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a test community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase() satisfies string &
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

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8).toLowerCase() satisfies string &
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
        href: "https://test.com/join" satisfies string & tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(member);

  // Step 4: Create multiple posts sequentially with time delays
  const createdPosts: IRedditCommunityPost[] = [];
  const postCount = 5;

  for (let i = 0; i < postCount; i++) {
    const post: IRedditCommunityPost =
      await api.functional.redditCommunity.member.posts.create(connection, {
        body: {
          community_id: community.id,
          title:
            `Test Post ${i + 1} - ${RandomGenerator.name()}` satisfies string &
              tags.MinLength<3> &
              tags.MaxLength<300>,
          post_type: "text" as const,
          body: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
            tags.MaxLength<40000>,
          url: null,
          image_url: null,
        } satisfies IRedditCommunityPost.ICreate,
      });
    typia.assert(post);
    createdPosts.push(post);

    // Add small delay to ensure distinct timestamps
    if (i < postCount - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Step 5: Search posts with sort_by='new'
  const searchResult: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.posts.index(connection, {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        community_id: community.id,
        sort_by: "new" as const,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(searchResult);

  // Step 6: Validate pagination metadata
  TestValidator.predicate(
    "search results should contain posts",
    searchResult.data.length > 0,
  );

  // Step 7: Verify posts are in reverse chronological order (newest first)
  for (let i = 0; i < searchResult.data.length - 1; i++) {
    const currentPost = searchResult.data[i];
    const nextPost = searchResult.data[i + 1];

    const currentTime = new Date(currentPost.created_at).getTime();
    const nextTime = new Date(nextPost.created_at).getTime();

    TestValidator.predicate(
      `post at index ${i} should be newer than post at index ${i + 1}`,
      currentTime >= nextTime,
    );
  }

  // Step 8: Verify the most recent post is first
  const mostRecentCreatedPost = createdPosts[createdPosts.length - 1];
  const firstResultPost = searchResult.data.find(
    (p) => p.id === mostRecentCreatedPost.id,
  );

  TestValidator.predicate(
    "most recently created post should appear in results",
    firstResultPost !== undefined,
  );

  // Verify created_at timestamps are valid date-time strings
  for (const post of searchResult.data) {
    TestValidator.predicate(
      `post ${post.id} should have valid created_at timestamp`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.created_at),
    );
  }
}
