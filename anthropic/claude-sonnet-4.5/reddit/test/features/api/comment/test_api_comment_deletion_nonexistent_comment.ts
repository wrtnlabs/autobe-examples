import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test deletion behavior when attempting to delete a comment that does not
 * exist.
 *
 * This test validates proper error handling for missing resources in the
 * comment deletion endpoint. It ensures the system gracefully handles attempts
 * to delete comments using non-existent UUIDs without causing system errors or
 * crashes.
 *
 * Test Flow:
 *
 * 1. Create and authenticate moderator account
 * 2. Create community for valid context
 * 3. Create and authenticate member account
 * 4. Create post within the community
 * 5. Generate random UUID for non-existent comment
 * 6. Attempt to delete the non-existent comment
 * 7. Verify appropriate error response is returned
 */
export async function test_api_comment_deletion_nonexistent_comment(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for community creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
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

  // Step 2: Create community for valid context
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
          display_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 10,
          }),
          rules: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 12,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 4 }),
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

  // Step 4: Create post within the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 10,
        }),
        post_type: "text",
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Generate random UUID for non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // Step 6: Attempt to delete the non-existent comment and verify error
  await TestValidator.error(
    "deletion of non-existent comment should fail",
    async () => {
      await api.functional.redditCommunity.member.posts.comments.erase(
        connection,
        {
          postId: post.id,
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
