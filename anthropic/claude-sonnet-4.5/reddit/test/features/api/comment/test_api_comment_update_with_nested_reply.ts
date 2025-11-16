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
 * Test updating a comment that is part of a nested reply thread.
 *
 * This test validates the complete workflow of creating and updating nested
 * reply comments within a Reddit-style community platform's threading system.
 *
 * The test follows this comprehensive flow:
 *
 * 1. Create two member accounts (one for the original commenter, one for the
 *    replier)
 * 2. Create a moderator account to establish a community
 * 3. Moderator creates a community
 * 4. Switch to first member and create a post in the community
 * 5. First member adds a top-level comment on the post
 * 6. Switch to second member and create a nested reply to the top-level comment
 * 7. Second member updates the nested reply content
 * 8. Validate that the update preserves all threading metadata and sets edited
 *    flag
 */
export async function test_api_comment_update_with_nested_reply(
  connection: api.IConnection,
) {
  // 1. Create first member account (will create top-level comment)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = typia.random<string & tags.MinLength<8>>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: member1Email,
      password: member1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member1);

  // 2. Create second member account (will create and update the nested reply)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = typia.random<string & tags.MinLength<8>>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: member2Email,
      password: member2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member2);

  // 3. Create moderator account to establish community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // 4. Moderator creates a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Switch to first member and create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. First member creates a top-level comment
  const topLevelComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(topLevelComment);

  // Validate top-level comment has depth 0
  TestValidator.equals(
    "top-level comment depth is 0",
    topLevelComment.depth,
    0,
  );
  TestValidator.equals(
    "top-level comment has no parent",
    topLevelComment.parent_comment_id,
    null,
  );

  // 7. Switch to second member and create nested reply
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const originalReplyBody = RandomGenerator.paragraph({ sentences: 4 });
  const nestedReply =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: originalReplyBody,
          parent_comment_id: topLevelComment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(nestedReply);

  // Validate nested reply structure before update
  TestValidator.equals(
    "nested reply parent ID matches",
    nestedReply.parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals("nested reply depth is 1", nestedReply.depth, 1);
  TestValidator.equals(
    "nested reply body matches",
    nestedReply.body,
    originalReplyBody,
  );
  TestValidator.equals(
    "nested reply edited flag is false",
    nestedReply.edited,
    false,
  );

  // 8. Second member updates the nested reply
  const updatedReplyBody = RandomGenerator.paragraph({ sentences: 6 });
  const updatedNestedReply =
    await api.functional.redditCommunity.member.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: nestedReply.id,
        body: {
          body: updatedReplyBody,
        } satisfies IRedditCommunityComment.IUpdate,
      },
    );
  typia.assert(updatedNestedReply);

  // 9. Validate the update preserved threading structure and updated metadata
  TestValidator.equals(
    "updated reply ID unchanged",
    updatedNestedReply.id,
    nestedReply.id,
  );
  TestValidator.equals(
    "updated reply parent ID preserved",
    updatedNestedReply.parent_comment_id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "updated reply depth preserved",
    updatedNestedReply.depth,
    1,
  );
  TestValidator.equals(
    "updated reply body changed",
    updatedNestedReply.body,
    updatedReplyBody,
  );
  TestValidator.equals(
    "updated reply edited flag is true",
    updatedNestedReply.edited,
    true,
  );
  TestValidator.equals(
    "updated reply post ID preserved",
    updatedNestedReply.reddit_community_post_id,
    post.id,
  );
  TestValidator.equals(
    "updated reply member ID preserved",
    updatedNestedReply.reddit_community_member_id,
    member2.id,
  );

  // Validate updated_at timestamp changed
  TestValidator.predicate(
    "updated_at timestamp is different from created_at",
    updatedNestedReply.updated_at !== updatedNestedReply.created_at,
  );
}
