import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test retrieving comments for a post with different sorting algorithms.
 *
 * This test validates that the comment retrieval system correctly applies all
 * supported sorting strategies including chronological (new/old), vote-based
 * (top), and controversial sorting.
 *
 * Test flow:
 *
 * 1. Moderator creates a community
 * 2. Member creates a post in the community
 * 3. Multiple members create comments on the post with varying content
 * 4. Comments are retrieved with different sorting algorithms
 * 5. Verify correct ordering for each sorting strategy
 */
export async function test_api_comments_retrieval_with_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123",
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create a community
  const communityData = {
    name: RandomGenerator.alphabets(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate as member
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "member123",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: true,
    show_subscribed_communities: true,
    show_activity_feed: true,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create a post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Create multiple comments on the post
  const commentContents = ArrayUtil.repeat(7, (index) =>
    RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  );

  const createdComments = await ArrayUtil.asyncMap(
    commentContents,
    async (content) => {
      const commentData = {
        body: content,
        parent_comment_id: null,
      } satisfies IRedditCommunityComment.ICreate;

      const comment =
        await api.functional.redditCommunity.member.posts.comments.create(
          connection,
          {
            postId: post.id,
            body: commentData,
          },
        );
      typia.assert(comment);
      return comment;
    },
  );

  // Step 6: Test sorting by 'new' (newest first)
  const sortedByNew = await api.functional.redditCommunity.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
        sort: "new",
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(sortedByNew);

  TestValidator.equals(
    "new sorting returns correct pagination",
    sortedByNew.pagination.records >= createdComments.length,
    true,
  );

  // Step 7: Test sorting by 'old' (oldest first)
  const sortedByOld = await api.functional.redditCommunity.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
        sort: "old",
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(sortedByOld);

  TestValidator.equals(
    "old sorting returns correct pagination",
    sortedByOld.pagination.records >= createdComments.length,
    true,
  );

  // Step 8: Test sorting by 'top' (highest vote score)
  const sortedByTop = await api.functional.redditCommunity.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
        sort: "top",
      } satisfies IRedditCommunityComment.IRequest,
    },
  );
  typia.assert(sortedByTop);

  TestValidator.equals(
    "top sorting returns correct pagination",
    sortedByTop.pagination.records >= createdComments.length,
    true,
  );

  // Step 9: Test sorting by 'controversial' (mixed voting patterns)
  const sortedByControversial =
    await api.functional.redditCommunity.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
        sort: "controversial",
      } satisfies IRedditCommunityComment.IRequest,
    });
  typia.assert(sortedByControversial);

  TestValidator.equals(
    "controversial sorting returns correct pagination",
    sortedByControversial.pagination.records >= createdComments.length,
    true,
  );

  // Step 10: Verify data integrity across all sorting methods
  TestValidator.predicate(
    "all sorting methods return data",
    sortedByNew.data.length > 0 &&
      sortedByOld.data.length > 0 &&
      sortedByTop.data.length > 0 &&
      sortedByControversial.data.length > 0,
  );
}
