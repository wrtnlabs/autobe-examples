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
 * Test authorization validation when a different member attempts to delete
 * another member's comment.
 *
 * This test validates the critical security requirement that only the original
 * comment author can delete their own comments. It creates two separate member
 * accounts, has the first member create a community, post, and comment, then
 * attempts deletion using the second member's authentication to verify that
 * proper authorization checks prevent unauthorized deletions.
 *
 * Test flow:
 *
 * 1. Create and authenticate first member account (comment author)
 * 2. First member creates a community
 * 3. First member creates a post in that community
 * 4. First member creates a comment on that post
 * 5. Create and authenticate second member account
 * 6. Switch to second member authentication
 * 7. Second member attempts to delete first member's comment
 * 8. Validate that deletion fails with authorization error
 */
export async function test_api_comment_deletion_by_different_member(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (comment author)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = typia.random<string & tags.MinLength<8>>();

  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: firstMemberEmail,
      password: firstMemberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: First member creates a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<21> &
              tags.Pattern<"^[a-z0-9_]+$">
          >(),
          display_title: typia.random<string & tags.MaxLength<100>>(),
          description: typia.random<string & tags.MaxLength<500>>(),
          rules: typia.random<string & tags.MaxLength<500>>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: First member creates a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        post_type: "text" as const,
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: First member creates a comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<10000>
          >(),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 5: Create second member account (unauthorized user)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = typia.random<string & tags.MinLength<8>>();

  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: secondMemberEmail,
      password: secondMemberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(secondMember);

  // Step 6: Attempt to delete first member's comment using second member's authentication
  // The second member is now authenticated (join operation set the auth token)
  // This should fail with authorization error
  await TestValidator.error(
    "different member cannot delete another member's comment",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.erase(
        connection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
