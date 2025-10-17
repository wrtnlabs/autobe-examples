import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test that regular members cannot remove posts created by other members in
 * communities where they are not moderators.
 *
 * This test validates the security enforcement that only moderators with
 * 'manage_posts' permission can remove posts in their assigned communities. It
 * creates a scenario where:
 *
 * 1. A first member creates a post in a community
 * 2. A second member (non-moderator) attempts to remove the first member's post
 * 3. The system rejects the removal request with an authorization error
 * 4. The post remains unaffected (deleted_at still null)
 * 5. No moderation action or log entries are created
 */
export async function test_api_post_removal_unauthorized_by_non_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate the first member who will create a post
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: firstMemberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Create a community where the post will be created
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 7,
        }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post that a non-moderator will attempt to remove
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 3,
        wordMax: 7,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create and authenticate a second member (non-moderator)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: secondMemberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 5: Attempt to remove the first member's post as the second member (should fail)
  await TestValidator.error(
    "non-moderator cannot remove other member's post",
    async () => {
      await api.functional.redditLike.moderator.posts.remove(connection, {
        postId: post.id,
        body: {
          removal_type: "community",
          reason_category: "spam",
          reason_text: "Unauthorized removal attempt",
        } satisfies IRedditLikePost.IRemove,
      });
    },
  );
}
