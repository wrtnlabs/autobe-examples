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
 * Test retrieving replies for a comment that has no replies yet.
 *
 * This test validates the endpoint's behavior when a valid parent comment
 * exists but has not received any replies. The test creates a post with a
 * top-level comment that has no replies, then attempts to retrieve the replies
 * list. The expected result is a successful response with an empty data array
 * and pagination metadata showing zero records.
 *
 * Steps:
 *
 * 1. Create and authenticate moderator account
 * 2. Moderator creates a community
 * 3. Create and authenticate member account
 * 4. Member creates a post in the community
 * 5. Member creates a top-level comment on the post (no replies)
 * 6. Retrieve replies for the comment
 * 7. Validate empty response with proper pagination metadata
 */
export async function test_api_comment_replies_retrieval_empty(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
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

  // Step 2: Moderator creates a community
  const communityData = {
    name: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<21> &
        tags.Pattern<"^[a-z0-9_]+$">
    >(),
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

  // Step 3: Create and authenticate member account
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
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
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Member creates a post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Member creates a top-level comment (no parent, so no replies)
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

  // Step 6: Retrieve replies for the comment (should be empty)
  const repliesRequest = {
    page: 1,
    limit: 20,
  } satisfies IRedditCommunityComment.IRequest;

  const repliesResponse: IPageIRedditCommunityComment.ISummary =
    await api.functional.redditCommunity.posts.comments.replies.index(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: repliesRequest,
      },
    );
  typia.assert(repliesResponse);

  // Step 7: Validate empty response with proper pagination metadata
  TestValidator.equals(
    "replies data should be empty array",
    repliesResponse.data,
    [],
  );
  TestValidator.equals(
    "total records should be 0",
    repliesResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    repliesResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 0",
    repliesResponse.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination limit should be set",
    repliesResponse.pagination.limit > 0,
  );
}
