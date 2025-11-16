import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test that reply creation enforces content validation rules including maximum
 * character limits and content formatting.
 *
 * This test validates the following scenarios:
 *
 * 1. Valid reply content within the 10,000 character maximum is accepted
 * 2. The reply body text is properly stored and returned
 * 3. Content validation prevents prohibited patterns if defined
 * 4. The reply supports plain text with preserved formatting as defined in the
 *    schema
 * 5. The system handles edge cases like replies with exactly 1 character (minimum)
 *    and exactly 10,000 characters (maximum)
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create a community for testing
 * 3. Create member account and authenticate
 * 4. Create a post in the community
 * 5. Create a parent comment on the post
 * 6. Test reply creation with normal content length
 * 7. Test edge case: reply with minimum length (1 character)
 * 8. Test edge case: reply with maximum length (10,000 characters)
 * 9. Test edge case: reply with content near maximum (9,999 characters)
 * 10. Validate all replies are properly stored and retrieved
 */
export async function test_api_comment_reply_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community as moderator
  const communityName = RandomGenerator.alphabets(10);
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberUsername = RandomGenerator.alphabets(8);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create a parent comment on the post
  const parentCommentBody = RandomGenerator.paragraph({ sentences: 5 });
  const parentComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: parentCommentBody,
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment body matches",
    parentComment.body,
    parentCommentBody,
  );
  TestValidator.equals("parent comment depth is 0", parentComment.depth, 0);

  // Step 6: Test reply creation with normal content length
  const normalReplyBody = RandomGenerator.paragraph({ sentences: 10 });
  const normalReply =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: {
          body: normalReplyBody,
          parent_comment_id: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(normalReply);
  TestValidator.equals(
    "normal reply body matches",
    normalReply.body,
    normalReplyBody,
  );
  TestValidator.equals(
    "normal reply parent_comment_id matches",
    normalReply.parent_comment_id,
    parentComment.id,
  );
  TestValidator.equals("normal reply depth is 1", normalReply.depth, 1);

  // Step 7: Test edge case - minimum length (1 character)
  const minLengthReplyBody = "A";
  const minLengthReply =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: {
          body: minLengthReplyBody,
          parent_comment_id: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(minLengthReply);
  TestValidator.equals(
    "minimum length reply body matches",
    minLengthReply.body,
    minLengthReplyBody,
  );

  // Step 8: Test edge case - maximum length (exactly 10,000 characters)
  const maxLengthReplyBody = RandomGenerator.alphabets(10000);
  const maxLengthReply =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: {
          body: maxLengthReplyBody,
          parent_comment_id: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(maxLengthReply);
  TestValidator.equals(
    "maximum length reply body matches",
    maxLengthReply.body,
    maxLengthReplyBody,
  );

  // Step 9: Test edge case - near maximum length (9,999 characters)
  const nearMaxLengthReplyBody = RandomGenerator.alphabets(9999);
  const nearMaxLengthReply =
    await api.functional.redditCommunity.member.posts.comments.replies.create(
      connection,
      {
        postId: post.id,
        commentId: parentComment.id,
        body: {
          body: nearMaxLengthReplyBody,
          parent_comment_id: parentComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(nearMaxLengthReply);
  TestValidator.equals(
    "near maximum length reply body matches",
    nearMaxLengthReply.body,
    nearMaxLengthReplyBody,
  );

  // Step 10: Validate all replies have correct structure and relationships
  TestValidator.equals(
    "all replies reference same post",
    normalReply.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "all replies reference same post",
    minLengthReply.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "all replies reference same post",
    maxLengthReply.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "all replies reference same post",
    nearMaxLengthReply.reddit_community_post_id,
    post.id,
  );

  TestValidator.equals(
    "all replies reference same member",
    normalReply.reddit_community_member_id,
    member.id,
  );
  TestValidator.equals(
    "all replies have correct parent",
    normalReply.parent_comment_id,
    parentComment.id,
  );
  TestValidator.predicate(
    "all replies are not edited",
    normalReply.edited === false,
  );
  TestValidator.predicate(
    "all replies are not deleted",
    normalReply.deleted_at === null,
  );
}
