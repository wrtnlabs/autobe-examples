import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Conducts a comprehensive test of the Reddit community member commenting
 * feature.
 *
 * The test workflow covers: member registration and login, community creation,
 * post creation, and commenting on the post, including nested comments.
 *
 * It validates that members can create top-level comments and nested replies on
 * posts, ensuring all required fields and relations are correctly handled.
 *
 * Steps:
 *
 * 1. Member registration: Create an authorized member for authentication.
 * 2. Community creation: Using the authorized member, create a new community with
 *    a unique name.
 * 3. Post creation: Create a text post within the created community.
 * 4. Comment creation: Add a root-level comment on the created post.
 * 5. Nested comment creation: Add a reply comment referencing the initial comment.
 * 6. Assertions: Use typia.assert to validate API responses and TestValidator to
 *    ensure correct data integrity.
 */
export async function test_api_reddit_community_member_create_comment_on_post(
  connection: api.IConnection,
) {
  // Step 1: Member joins (registers and authenticates)
  const memberCreate = {
    email: RandomGenerator.alphabets(8) + "@example.com",
    password: "SecurePass123",
  } satisfies IRedditCommunityMember.ICreate;

  const authorizedMember: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: memberCreate });
  typia.assert(authorizedMember);

  // Step 2: Create a community with a unique name
  const communityCreate = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // Step 3: Create a text post in the community
  const postCreate = {
    post_type: "text",
    reddit_community_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body_text: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IRedditCommunityPosts.ICreate;

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreate,
      },
    );
  typia.assert(post);

  // Step 4: Create a root-level comment on the post
  const commentCreate: IRedditCommunityComment.ICreate = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({ sentences: 3 }),
    author_member_id: authorizedMember.id,
    parent_comment_id: null,
  };

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "Root comment's author matches authorized member",
    comment.author_member_id,
    authorizedMember.id,
  );

  // Step 5: Create a nested comment (reply) referencing the root comment
  const replyCreate: IRedditCommunityComment.ICreate = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({ sentences: 2 }),
    author_member_id: authorizedMember.id,
    parent_comment_id: comment.id,
  };

  const replyComment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: replyCreate,
      },
    );
  typia.assert(replyComment);

  TestValidator.equals(
    "Reply comment's parent matches root comment",
    replyComment.parent_comment_id,
    comment.id,
  );
}
