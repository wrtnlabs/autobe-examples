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
 * Test that comments can be retrieved without authentication for public
 * communities.
 *
 * This test validates the public read access model by ensuring that guest users
 * can browse comment threads without requiring login credentials. The test
 * verifies:
 *
 * 1. A moderator creates a public community
 * 2. A member creates a post with comments
 * 3. Comments can be retrieved successfully without any authentication headers
 * 4. The response includes all public comment data with author information
 * 5. Pagination and sorting work correctly for unauthenticated requests
 *
 * This validates that the platform supports public content browsing before user
 * registration.
 */
export async function test_api_comments_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create a public community
  const communityData = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a post in the public community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 3 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create multiple comments on the post
  const commentCount = 5;
  const comments: IRedditCommunityComment[] = await ArrayUtil.asyncRepeat(
    commentCount,
    async (index) => {
      const commentData = {
        body: RandomGenerator.paragraph({ sentences: 3 }),
        parent_comment_id: null,
      } satisfies IRedditCommunityComment.ICreate;

      const comment: IRedditCommunityComment =
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

  // Step 6: Create an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 7: Retrieve comments without authentication
  const retrievalRequest = {
    page: 1,
    limit: 10,
    sort: "new" as const,
  } satisfies IRedditCommunityComment.IRequest;

  const commentsPage: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.index(
      unauthenticatedConnection,
      {
        postId: post.id,
        body: retrievalRequest,
      },
    );
  typia.assert(commentsPage);

  // Step 8: Validate response structure and data
  TestValidator.predicate(
    "should retrieve all created comments",
    commentsPage.data.length === commentCount,
  );

  // Step 9: Test pagination with different page sizes
  const smallPageRequest = {
    page: 1,
    limit: 2,
    sort: "new" as const,
  } satisfies IRedditCommunityComment.IRequest;

  const smallPage: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.index(
      unauthenticatedConnection,
      {
        postId: post.id,
        body: smallPageRequest,
      },
    );
  typia.assert(smallPage);

  TestValidator.predicate(
    "pagination should respect limit parameter",
    smallPage.data.length <= 2,
  );

  // Step 10: Test different sorting options
  const sortByOld = {
    page: 1,
    limit: 10,
    sort: "old" as const,
  } satisfies IRedditCommunityComment.IRequest;

  const oldSortedPage: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.index(
      unauthenticatedConnection,
      {
        postId: post.id,
        body: sortByOld,
      },
    );
  typia.assert(oldSortedPage);

  TestValidator.predicate(
    "old sort should return comments",
    oldSortedPage.data.length > 0,
  );
}
